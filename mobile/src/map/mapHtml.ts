// The map page shown inside the WebView. Plain JavaScript (no build step), so the
// same page also runs in a desktop browser: see scripts/preview-map.ts.
//
// App → page: window.mantide.setState(partialMapState)
// Page → app: {type: 'ready'} | {type: 'toggle', level, id, name} | {type: 'error', message}
// Boundaries arrive before load in window.__MANTIDE_GEO = {countries, regions, provinces}.

export const MAPLIBRE_VERSION = '5.6.0';
export const H3_VERSION = '4.1.0';

export const mapHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/h3-js@${H3_VERSION}/dist/h3-js.umd.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #071521; }
  .maplibregl-ctrl-attrib { font-size: 9px; }
  /* Keep the attribution button above the app's scale switcher. */
  .maplibregl-ctrl-bottom-right { bottom: 72px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  var ACCENT = '#ff7a45';
  var VEIL = '#eef3f1';
  var HEX_RES = 8;      // about 0.7 km2 per hexagon
  var HEX_RINGS = 8;    // hexagons drawn around the focus point at the local scale
  var LEVEL = { global: 'country', national: 'region', regional: 'province', local: 'hex' };

  function send(msg) {
    var text = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else console.log('[to app]', text);
  }
  window.onerror = function (message) { send({ type: 'error', message: String(message) }); };

  var GEO = window.__MANTIDE_GEO || { countries: { features: [] }, regions: { features: [] }, provinces: { features: [] } };
  var state = {
    scale: 'global',
    focus: { country: 'ITA', region: '05', lat: 45.6297, lon: 12.3766 },
    visited: { country: [], region: [], province: [], hex: [] },
    points: []
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

  map.on('style.load', function () { map.setProjection({ type: 'globe' }); });

  map.on('load', function () {
    map.addSource('areas', { type: 'geojson', data: collection([]) });
    map.addSource('points', { type: 'geojson', data: collection([]) });
    // Unvisited areas sit under a light veil; visited ones show the land in full color.
    map.addLayer({ id: 'areas-fill', type: 'fill', source: 'areas', paint: {
      'fill-color': ['case', ['get', 'visited'], ACCENT, VEIL],
      'fill-opacity': ['case', ['get', 'visited'], 0.06, 0.5]
    } });
    map.addLayer({ id: 'areas-line', type: 'line', source: 'areas', paint: {
      'line-color': ['case', ['get', 'visited'], ACCENT, '#ffffff'],
      'line-width': ['case', ['get', 'visited'], 2.2, 0.6],
      'line-opacity': 0.9
    } });
    map.addLayer({ id: 'points', type: 'circle', source: 'points', paint: {
      'circle-radius': 4.5, 'circle-color': '#ffffff', 'circle-stroke-color': ACCENT, 'circle-stroke-width': 2
    } });

    map.on('click', 'areas-fill', function (e) {
      var p = e.features[0].properties;
      send({ type: 'toggle', level: p.level, id: p.id, name: p.name });
      if (!window.ReactNativeWebView) toggleLocally(p.level, p.id);
    });

    // The compact attribution starts open; close it so it doesn't cover the map.
    var attrib = document.querySelector('.maplibregl-ctrl-attrib');
    if (attrib) attrib.classList.remove('maplibregl-compact-show');

    render(true);
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

  // Hexagons around the focus point. A hexagon is visited when marked by hand
  // or when a photo or the current position falls inside it.
  function hexagons() {
    var visited = new Set(state.visited.hex || []);
    state.points.forEach(function (p) { visited.add(h3.latLngToCell(p[1], p[0], HEX_RES)); });
    var cells = h3.gridDisk(h3.latLngToCell(state.focus.lat, state.focus.lon, HEX_RES), HEX_RINGS);
    return cells.map(function (cell) {
      return { type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [h3.cellToBoundary(cell, true)] },
        properties: { id: cell, name: 'Zona ' + cell.slice(-5), level: 'hex', visited: visited.has(cell) } };
    });
  }

  // Regions and provinces exist only for Italy: elsewhere the national and
  // regional scales show the focused country.
  function areas() {
    var f = state.focus;
    var level = LEVEL[state.scale];
    if (state.scale === 'local') return hexagons();
    if (state.scale === 'global') return withVisited(GEO.countries.features, level);
    if (f.country !== 'ITA') {
      return withVisited(GEO.countries.features.filter(function (x) { return x.properties.id === f.country; }), 'country');
    }
    if (state.scale === 'national') return withVisited(GEO.regions.features, level);
    return withVisited(GEO.provinces.features.filter(function (x) { return x.properties.region === f.region; }), level);
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

  function moveCamera(features) {
    var center = [state.focus.lon, state.focus.lat];
    if (state.scale === 'global') return map.easeTo({ center: center, zoom: 1.4, duration: 1200 });
    if (state.scale === 'local') return map.easeTo({ center: center, zoom: 12.4, duration: 1200 });
    var b = bbox(features);
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
    if (withCamera) moveCamera(features);
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
      Object.keys(next).forEach(function (k) { state[k] = next[k]; });
      render(moved);
    }
  };
})();
</script>
</body>
</html>`;
