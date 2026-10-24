// The map page shown inside the WebView. Plain JavaScript (no build step), so the
// same page also runs in a desktop browser: see scripts/preview-map.ts.
//
// App → page: window.mantide.setState(partialMapState); `timeline: {until}` shows only the photos
// taken until then and animates the journey to the latest one.
// Page → app: {type: 'ready'} | {type: 'toggle', level, id, name} | {type: 'photo', id} | {type: 'event', id}
//             | {type: 'error', message}
// Boundaries are written into the page by withGeo() as window.__MANTIDE_GEO =
// {countries, regions (Italy), provinces (Italy), worldRegions (first-level units elsewhere, with `group`
// for Spain, France, UK, Portugal), worldGroups (the real regions of those four)}.

export const MAPLIBRE_VERSION = '5.6.0';

export const mapHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #071521; }
  .maplibregl-ctrl-attrib { font-size: 9px; }
  /* The attribution button sits on the right, just under the app's header (chromeTop), clear of the bottom panels. */
  .maplibregl-ctrl-bottom-right { bottom: auto; top: var(--chrome-top, 120px); }
  /* Photo markers, like the map in the iPhone Photos app. No position here: MapLibre sets it. */
  .ph { width: 44px; height: 44px; box-sizing: border-box; border: 2px solid #fff; border-radius: 8px;
    background: #24323d; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45); cursor: pointer; }
  .ph img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 6px; pointer-events: none; }
  .ph-dot { width: 16px; height: 16px; box-sizing: border-box; border: 3px solid #ff7a45; border-radius: 50%;
    background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4); cursor: pointer; }
  .ph-badge { position: absolute; top: -8px; right: -8px; min-width: 20px; height: 20px; padding: 0 5px;
    box-sizing: border-box; border-radius: 10px; background: #ff7a45; color: #1a0d06; text-align: center;
    font: 700 11px/20px -apple-system, Roboto, sans-serif; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4); pointer-events: none; }
  /* The head of the journey on the timeline: above the photo thumbnails, with a slow pulse. */
  .tl-head { width: 18px; height: 18px; box-sizing: border-box; border: 3px solid #fff; border-radius: 50%;
    background: #ff7a45; z-index: 5; animation: tl-pulse 1.6s ease-out infinite; }
  @keyframes tl-pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 122, 69, 0.55); } 100% { box-shadow: 0 0 0 16px rgba(255, 122, 69, 0); } }
  @media (prefers-reduced-motion: reduce) { .tl-head { animation: none; box-shadow: 0 0 0 6px rgba(255, 122, 69, 0.35); } }
</style>
</head>
<body>
<div id="map"></div>
<!-- GEO -->
<script>
(function () {
  var ACCENT = '#ff7a45';
  var VEIL = '#eef3f1';
  var LEVEL = { global: 'country', national: 'region', regional: 'province' };
  var PHOTO_MIN_ZOOM = 1.8; // below this the globe stays clean

  function send(msg) {
    var text = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else console.log('[to app]', text);
  }
  window.onerror = function (message) { send({ type: 'error', message: String(message) }); };

  var GEO = window.__MANTIDE_GEO || { countries: { features: [] }, regions: { features: [] }, provinces: { features: [] }, worldRegions: { features: [] }, worldGroups: { features: [] } };
  var state = {
    scale: 'global',
    focus: { country: 'ITA', region: '05', lat: 45.6297, lon: 12.3766 },
    visited: { country: [], region: [], province: [] },
    points: [],
    photos: [],
    events: [],
    timeline: null
  };

  var map = new maplibregl.Map({
    container: 'map',
    center: [state.focus.lon, state.focus.lat],
    zoom: 1.4,
    attributionControl: { compact: true },
    style: {
      version: 8,
      sources: {
        satellite: {
          type: 'raster',
          tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'],
          tileSize: 256,
          maxzoom: 14,
          attribution: 'Sentinel-2 cloudless 2016 by EOX IT Services (CC BY 4.0), modified Copernicus Sentinel data'
        }
      },
      layers: [
        { id: 'space', type: 'background', paint: { 'background-color': '#071521' } },
        { id: 'satellite', type: 'raster', source: 'satellite' }
      ]
    }
  });

  window.mantideMap = map; // for debugging from the browser console
  map.on('style.load', function () { map.setProjection({ type: 'globe' }); });

  map.on('load', function () {
    map.addSource('areas', { type: 'geojson', data: collection([]) });
    map.addSource('points', { type: 'geojson', data: collection([]) });
    map.addSource('trips', { type: 'geojson', data: collection([]) });
    map.addSource('events', { type: 'geojson', data: collection([]) });
    map.addSource('journey', { type: 'geojson', data: collection([]) });
    // The cluster keeps the best rank of its photos, to show the newest one as its cover.
    map.addSource('photos', { type: 'geojson', data: collection([]), cluster: true, clusterRadius: 60, clusterMaxZoom: 15,
      clusterProperties: { top: ['max', ['get', 'rank']] } });
    // Unvisited areas sit under a light veil; visited ones light up in orange.
    map.addLayer({ id: 'areas-fill', type: 'fill', source: 'areas', paint: {
      'fill-color': ['case', ['get', 'visited'], ACCENT, VEIL],
      'fill-opacity': ['case', ['get', 'visited'], 0.35, 0.5]
    } });
    map.addLayer({ id: 'areas-line', type: 'line', source: 'areas', paint: {
      'line-color': ['case', ['get', 'visited'], ACCENT, '#ffffff'],
      'line-width': ['case', ['get', 'visited'], 2.6, 0.6],
      'line-opacity': 0.9
    } });
    // Each trip is a dashed line through its photos in the order they were taken.
    map.addLayer({ id: 'trips', type: 'line', source: 'trips',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.85, 'line-dasharray': [1.5, 1.5] } });
    map.addLayer({ id: 'points', type: 'circle', source: 'points', paint: {
      'circle-radius': 4.5, 'circle-color': '#ffffff', 'circle-stroke-color': ACCENT, 'circle-stroke-width': 2
    } });
    // The journey on the timeline: one solid line through every photo, in the order taken.
    map.addLayer({ id: 'journey', type: 'line', source: 'journey',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ACCENT, 'line-width': 3, 'line-opacity': 0.95 } });
    // Events for you, at the local scale: orange dots with a white ring.
    map.addLayer({ id: 'events', type: 'circle', source: 'events', paint: {
      'circle-radius': 9, 'circle-color': ACCENT, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3
    } });
    // Invisible: only tells which photos and clusters are on screen. The markers are HTML.
    map.addLayer({ id: 'photos-hit', type: 'circle', source: 'photos', paint: {
      'circle-radius': 22, 'circle-opacity': 0, 'circle-stroke-width': 0
    } });
    map.on('render', updateMarkers);

    map.on('click', 'events', function (e) {
      send({ type: 'event', id: e.features[0].properties.id });
    });
    map.on('click', 'areas-fill', function (e) {
      var p = e.features[0].properties;
      send({ type: 'toggle', level: p.level, id: p.id, name: p.name });
      if (!window.ReactNativeWebView) toggleLocally(p.level, p.id);
    });

    // The compact attribution starts open; close it so it doesn't cover the map.
    var attrib = document.querySelector('.maplibregl-ctrl-attrib');
    if (attrib) attrib.classList.remove('maplibregl-compact-show');

    render(true);
    renderPhotos();
    send({ type: 'ready' });
  });

  function collection(features) { return { type: 'FeatureCollection', features: features }; }

  function withVisited(features, level) {
    var visited = new Set(state.visited[level] || []);
    return features.map(function (f) {
      return { type: 'Feature', geometry: f.geometry,
        properties: { id: f.properties.id, name: f.properties.name, level: level, visited: visited.has(f.properties.id) } };
    });
  }

  // The national and regional scales follow the country you are in. Italy has regions and
  // provinces; elsewhere the national scale shows the country's regions and the regional
  // scale your region. The local scale shows no areas, only the land, your photos and the
  // events around you.
  function areas() {
    var f = state.focus;
    var level = LEVEL[state.scale];
    if (state.scale === 'local') return [];
    if (state.scale === 'global') return withVisited(GEO.countries.features, level);
    if (f.country === 'ITA') {
      if (state.scale === 'national') return withVisited(GEO.regions.features, level);
      return withVisited(GEO.provinces.features.filter(function (x) { return x.properties.region === f.region; }), level);
    }
    var units = GEO.worldRegions.features.filter(function (x) { return x.properties.country === f.country; });
    var groups = GEO.worldGroups.features.filter(function (x) { return x.properties.country === f.country; });
    if (state.scale === 'national') {
      // Spain, France, UK, Portugal: their real regions; elsewhere the first-level units.
      if (groups.length) return withVisited(groups, 'region');
      if (units.length) return withVisited(units, 'region');
    } else {
      // Regional: the provinces or departments of your region, or your region itself.
      var inside = units.filter(function (x) { return x.properties.group && x.properties.group === f.region; });
      if (inside.length) return withVisited(inside, 'province');
      var own = units.filter(function (x) { return x.properties.id === f.region; });
      if (own.length) return withVisited(own, 'region');
    }
    return withVisited(GEO.countries.features.filter(function (x) { return x.properties.id === f.country; }), 'country');
  }

  function bbox(features) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    features.forEach(function (f) {
      var polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      polys.forEach(function (poly) {
        poly[0].forEach(function (c) {
          b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]);
          b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]);
        });
      });
    });
    return b[0] === Infinity ? null : [[b[0], b[1]], [b[2], b[3]]];
  }

  function eventFeatures() {
    if (state.scale !== 'local') return [];
    return state.events.map(function (e) {
      return { type: 'Feature', geometry: { type: 'Point', coordinates: [e.lon, e.lat] }, properties: { id: e.id } };
    });
  }

  function moveCamera(features) {
    var center = [state.focus.lon, state.focus.lat];
    if (state.scale === 'global') return map.easeTo({ center: center, zoom: 1.4, duration: 1200 });
    if (state.scale === 'local') {
      // Frame you and the events around you, above the app's panel of event cards.
      var lons = [center[0]].concat(state.events.map(function (e) { return e.lon; }));
      var lats = [center[1]].concat(state.events.map(function (e) { return e.lat; }));
      if (lons.length < 2) return map.easeTo({ center: center, zoom: 10.5, duration: 1200 });
      return map.fitBounds([[Math.min.apply(null, lons), Math.min.apply(null, lats)], [Math.max.apply(null, lons), Math.max.apply(null, lats)]],
        { padding: { top: 120, bottom: 330, left: 40, right: 40 }, maxZoom: 12, duration: 1200 });
    }
    // Overseas pieces (French Guiana, Hawaii…) would zoom out to the whole world: frame only
    // the areas within NEAR_DEG of where you are looking.
    var NEAR_DEG = 20;
    var near = features.filter(function (f) {
      var c = bbox([f]);
      if (!c) return false;
      var lon = (c[0][0] + c[1][0]) / 2, lat = (c[0][1] + c[1][1]) / 2;
      return Math.abs(lon - state.focus.lon) < NEAR_DEG && Math.abs(lat - state.focus.lat) < NEAR_DEG;
    });
    var b = bbox(near.length ? near : features);
    // Room for the app's header card on top and scale switcher at the bottom.
    if (b) map.fitBounds(b, { padding: { top: 110, bottom: 90, left: 24, right: 24 }, duration: 1200 });
  }

  function render(withCamera) {
    if (!map.getSource('areas')) return;
    var features = areas();
    map.getSource('areas').setData(collection(features));
    var points = state.scale === 'global' ? [] : state.points.map(function (p) {
      return { type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} };
    });
    map.getSource('points').setData(collection(points));
    map.getSource('events').setData(collection(eventFeatures()));
    if (withCamera) moveCamera(features);
  }

  // Photos: thumbnails stay out of the source (tiles stay light) and are looked up by id.
  var photoThumbs = {}; // id -> data URI
  var photoByRank = {}; // rank -> id, to find a cluster's cover
  var markers = {};     // key -> Marker, reused while the photos don't change
  var onScreen = {};

  // On the timeline only the photos taken until the chosen moment exist.
  function visiblePhotos() {
    if (!state.timeline) return state.photos;
    return state.photos.filter(function (p) { return p.takenAt && p.takenAt <= state.timeline.until; });
  }

  function byTime(a, b) { return a.takenAt - b.takenAt; }

  function photoFeatures() {
    photoThumbs = {};
    photoByRank = {};
    return visiblePhotos().map(function (p) {
      // Photos with a thumbnail outrank those without; then the newest wins.
      var rank = (p.thumb ? 1e13 : 0) + (p.takenAt || 0);
      if (p.thumb) photoThumbs[p.id] = p.thumb;
      photoByRank[rank] = p.id;
      return { type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: { id: p.id, takenAt: p.takenAt || 0, rank: rank } };
    });
  }

  // Trips: photos in time order; more than TRIP_GAP_DAYS without photos starts a new trip.
  var TRIP_GAP_DAYS = 4;
  function tripLines() {
    var sorted = visiblePhotos().filter(function (p) { return p.takenAt; }).sort(byTime);
    var trips = [];
    var current = [];
    sorted.forEach(function (p, i) {
      if (i > 0 && p.takenAt - sorted[i - 1].takenAt > TRIP_GAP_DAYS * 864e5) {
        if (current.length > 1) trips.push(current);
        current = [];
      }
      current.push([p.lon, p.lat]);
    });
    if (current.length > 1) trips.push(current);
    return trips.map(function (coords) {
      return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} };
    });
  }

  function renderPhotos() {
    if (!map.getSource('photos')) return;
    map.getSource('trips').setData(collection(tripLines()));
    Object.keys(onScreen).forEach(function (k) { onScreen[k].remove(); });
    markers = {};
    onScreen = {};
    map.getSource('photos').setData(collection(photoFeatures()));
  }

  // The journey's head travels from the previous place to the new one; the map follows it.
  var JOURNEY_MS = 400;
  var head = null;        // [lon, lat] where the head is now
  var headMarker = null;
  var frame = 0;

  function renderJourney() {
    if (!map.getSource('journey')) return;
    cancelAnimationFrame(frame);
    var path = state.timeline ? visiblePhotos().slice().sort(byTime).map(function (p) { return [p.lon, p.lat]; }) : [];
    if (!path.length) {
      map.getSource('journey').setData(collection([]));
      if (headMarker) headMarker.remove();
      headMarker = null;
      head = null;
      return;
    }
    var to = path[path.length - 1];
    var from = head || to;
    var start = performance.now();
    function step(now) {
      var t = Math.min(1, (now - start) / JOURNEY_MS);
      var e = t * (2 - t); // ease out
      head = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
      var line = path.slice(0, -1).concat([head]);
      map.getSource('journey').setData(collection(line.length > 1
        ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: line }, properties: {} }] : []));
      if (!headMarker) {
        var el = document.createElement('div');
        el.className = 'tl-head';
        headMarker = new maplibregl.Marker({ element: el }).setLngLat(head).addTo(map);
      } else {
        headMarker.setLngLat(head);
      }
      if (t < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    map.easeTo({ center: to, duration: JOURNEY_MS + 100 });
  }

  function makeMarker(coords, clusterId, id, count) {
    var thumb = id && photoThumbs[id];
    var el = document.createElement('div');
    el.className = thumb ? 'ph' : 'ph-dot';
    if (thumb) {
      var img = document.createElement('img');
      img.src = thumb;
      img.alt = '';
      el.appendChild(img);
    }
    if (count > 1) {
      var badge = document.createElement('span');
      badge.className = 'ph-badge';
      badge.textContent = count > 999 ? '999+' : String(count);
      el.appendChild(badge);
    }
    el.addEventListener('click', function (e) {
      e.stopPropagation(); // don't toggle the area under the photo
      if (clusterId === null) return send({ type: 'photo', id: id });
      map.getSource('photos').getClusterExpansionZoom(clusterId).then(function (zoom) {
        map.easeTo({ center: coords, zoom: zoom, duration: 600 });
      }).catch(function () {});
    });
    return new maplibregl.Marker({ element: el, opacityWhenCovered: '0' }).setLngLat(coords);
  }

  function updateMarkers() {
    if (!map.getLayer('photos-hit') || !map.isSourceLoaded('photos')) return;
    var next = {};
    if (map.getZoom() >= PHOTO_MIN_ZOOM) {
      map.queryRenderedFeatures({ layers: ['photos-hit'] }).forEach(function (f) {
        var p = f.properties;
        var key = p.cluster ? 'c' + p.cluster_id : 'p' + p.id;
        if (next[key]) return;
        if (!markers[key]) {
          markers[key] = p.cluster
            ? makeMarker(f.geometry.coordinates.slice(), p.cluster_id, photoByRank[p.top], p.point_count)
            : makeMarker(f.geometry.coordinates.slice(), null, p.id, 1);
        }
        next[key] = markers[key];
        if (!onScreen[key]) markers[key].addTo(map);
      });
    }
    Object.keys(onScreen).forEach(function (k) { if (!next[k]) onScreen[k].remove(); });
    onScreen = next;
  }

  function toggleLocally(level, id) {
    var list = state.visited[level];
    var i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    render(false);
  }

  window.mantide = {
    setState: function (next) {
      var moved = (next.scale && next.scale !== state.scale) ||
        (next.focus && JSON.stringify(next.focus) !== JSON.stringify(state.focus));
      var timelineChanged = 'timeline' in next && JSON.stringify(next.timeline) !== JSON.stringify(state.timeline);
      Object.keys(next).forEach(function (k) { state[k] = next[k]; });
      if (next.chromeTop) document.documentElement.style.setProperty('--chrome-top', next.chromeTop + 'px');
      render(moved && !state.timeline);
      if (next.photos || timelineChanged) renderPhotos();
      if (next.photos || timelineChanged) renderJourney();
    }
  };
})();
</script>
</body>
</html>`;

// Writes the boundaries into the page itself, so they exist before the page script runs on every
// Android WebView version (injectedJavaScriptBeforeContentLoaded depends on the system WebView).
export function withGeo(geo: unknown): string {
  return mapHtml.replace('<!-- GEO -->', `<script>window.__MANTIDE_GEO = ${JSON.stringify(geo)};</script>`);
}
