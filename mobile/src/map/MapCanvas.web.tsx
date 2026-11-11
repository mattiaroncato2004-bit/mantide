// The map in the browser: MapLibre GL JS drawing what src/map/model.ts computed, with the shared
// style of src/map/style.ts. Photo pins, the "you are here" dot and ring labels are HTML markers.
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Level } from '../types';
import { baseStyle, OVERLAY_LAYERS, OVERLAY_SOURCES } from './style';
import type { MapCanvasProps } from './types';

const EMPTY = { type: 'FeatureCollection' as const, features: [] };

// Pins like the iPhone Photos map: a rounded thumbnail with a white border, a count badge, and a
// small point under it touching the place. "You" is the blue dot of every maps app.
const CSS = `
.mt-pin { width: 46px; height: 46px; box-sizing: border-box; border: 2.5px solid #fff; border-radius: 10px; background: #24323d center/cover;
  box-shadow: 0 3px 10px rgba(0,0,0,.45); cursor: pointer; }
.mt-pin::after { content: ''; position: absolute; left: 50%; bottom: -8px; margin-left: -5px;
  border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #fff; }
.mt-badge { position: absolute; top: -9px; right: -9px; min-width: 20px; height: 20px; padding: 0 5px; box-sizing: border-box;
  border-radius: 10px; background: #fff; color: #111; font: 700 11px/20px Inter_700Bold, -apple-system, sans-serif; text-align: center; }
.mt-you { width: 22px; height: 22px; box-sizing: border-box; border: 4px solid #fff; border-radius: 50%; background: #3d8bff;
  animation: mt-pulse 2s ease-out infinite; z-index: 5; }
@keyframes mt-pulse { 0% { box-shadow: 0 0 0 0 rgba(61,139,255,.6); } 100% { box-shadow: 0 0 0 22px rgba(61,139,255,0); } }
@media (prefers-reduced-motion: reduce) { .mt-you { animation: none; box-shadow: 0 0 0 7px rgba(61,139,255,.3); } }
.mt-label { position: absolute; white-space: nowrap; padding: 2px 7px; border-radius: 6px; background: rgba(8,15,19,.85);
  color: #fff; font: 600 11px/16px Inter_600SemiBold, -apple-system, sans-serif; pointer-events: none; }
.mt-you .mt-label { top: 24px; left: 50%; transform: translateX(-50%); }
`;

function addOverlays(map: MapLibreMap) {
  for (const id of OVERLAY_SOURCES) if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: EMPTY });
  for (const layer of OVERLAY_LAYERS) if (!map.getLayer(layer.id)) map.addLayer(layer as maplibregl.LayerSpecification);
}

export function MapCanvas(props: MapCanvasProps) {
  const host = useRef<ComponentRef<typeof View>>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const pins = useRef(new Map<string, Marker>());
  const extras = useRef<{ key: string; markers: Marker[] }>({ key: '', markers: [] });
  const ready = useRef(false);

  // Create the map once; callbacks read the latest props through `latest`.
  useEffect(() => {
    if (!document.getElementById('mt-css')) {
      const style = document.createElement('style');
      style.id = 'mt-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const map = new maplibregl.Map({
      container: host.current as unknown as HTMLElement,
      style: baseStyle(latest.current.basemap) as maplibregl.StyleSpecification | string,
      center: [-98, 39],
      zoom: 1.4,
      attributionControl: false,
    });
    // Credits top-left: the bottom belongs to the sheet, the top-right to the map buttons.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-left');
    mapRef.current = map;
    (window as unknown as { __mantideMap: MapLibreMap }).__mantideMap = map;

    // A move the person made carries the browser event that started it.
    const report = (e?: { originalEvent?: unknown }) => {
      const b = map.getBounds();
      const c = map.getCenter();
      latest.current.onViewChange({
        zoom: map.getZoom(), bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], center: [c.lng, c.lat], user: !!e?.originalEvent,
      });
    };
    map.on('style.load', () => {
      addOverlays(map);
      ready.current = true;
      sync(map, latest.current);
    });
    map.on('load', () => {
      report();
      // MapLibre opens the compact credits at first: start them folded behind their ⓘ.
      const credits = host.current && (host.current as unknown as HTMLElement).querySelector('.maplibregl-ctrl-attrib');
      credits?.classList.remove('maplibregl-compact-show');
      credits?.removeAttribute('open');
    });
    map.on('moveend', report);
    map.on('click', 'areas-fill', (e) => {
      const p = e.features?.[0]?.properties as { level: Level; id: string } | undefined;
      if (p) latest.current.onAreaPress(p.level, p.id);
    });
    map.on('click', 'events', (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) latest.current.onEventPress(id);
    });
    return () => {
      map.remove();
      mapRef.current = null;
      ready.current = false;
    };
  }, []);

  // Basemap switch: the overlays are re-added on style.load.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    ready.current = false;
    map.setStyle(baseStyle(props.basemap) as maplibregl.StyleSpecification | string, { diff: false });
  }, [props.basemap]);

  // Data and markers follow the props.
  useEffect(() => {
    const map = mapRef.current;
    if (map && ready.current) sync(map, props);
    if (map) syncMarkers(map, props, pins.current, extras);
  });

  // A new camera key moves the camera, framing above the sheet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const padding = { top: 72, bottom: props.sheetHeight + 16, left: 24, right: 24 };
    const target = props.camera;
    if ('bounds' in target) {
      const [w, s, e, n] = target.bounds;
      map.fitBounds([[w, s], [e, n]], { padding, duration: 900 });
    } else {
      map.easeTo({ center: target.center, zoom: target.zoom, padding, duration: 900 });
    }
  }, [props.camera.key]);

  // MapLibre's stylesheet makes its container `position: relative`: the absolute positioning lives on
  // an outer view, and the map fills it.
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} testID="map-canvas">
      <View ref={host} style={styles.fill} />
    </View>
  );
}

function sync(map: MapLibreMap, p: MapCanvasProps) {
  const set = (id: (typeof OVERLAY_SOURCES)[number], data: GeoJSON.FeatureCollection) => (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
  set('areas', p.areas);
  set('journey', p.journey ? { type: 'FeatureCollection', features: [p.journey] } : EMPTY);
  set('rings', { type: 'FeatureCollection', features: p.rings.map((r) => r.ring) });
  set('events', {
    type: 'FeatureCollection',
    features: p.events.map((e) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lon, e.lat] }, properties: { id: e.id, selected: e.selected } })),
  });
}

// Pins are reconciled by cluster key, so panning doesn't rebuild every image.
function syncMarkers(map: MapLibreMap, p: MapCanvasProps, pins: Map<string, Marker>, extras: { current: { key: string; markers: Marker[] } }) {
  const keep = new Set(p.clusters.map((c) => c.key));
  for (const [key, marker] of pins) {
    if (!keep.has(key)) {
      marker.remove();
      pins.delete(key);
    }
  }
  for (const c of p.clusters) {
    let marker = pins.get(c.key);
    if (!marker) {
      const el = document.createElement('div');
      el.className = 'mt-pin';
      el.dataset.testid = 'photo-pin';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (c.count > 1) p.onClusterPress(c.key);
        else p.onPhotoPress(c.coverId);
      });
      marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -8] }).setLngLat([c.lon, c.lat]).addTo(map);
      pins.set(c.key, marker);
    }
    const el = marker.getElement();
    const thumb = p.thumbs[c.coverId];
    if (thumb) el.style.backgroundImage = `url("${thumb}")`;
    let badge = el.querySelector('.mt-badge') as HTMLElement | null;
    if (c.count > 1) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'mt-badge';
        badge.dataset.testid = 'pin-count';
        el.appendChild(badge);
      }
      badge.textContent = c.count > 999 ? '999+' : String(c.count);
    } else badge?.remove();
  }

  // "You" and the ring labels are few: rebuild them only when they change (the pulse would restart).
  const key = JSON.stringify([p.you, p.rings.map((r) => [r.km, r.labelAt])]);
  if (key === extras.current.key) return;
  extras.current.markers.forEach((m) => m.remove());
  extras.current = { key, markers: [] };
  if (p.you) {
    const el = document.createElement('div');
    el.className = 'mt-you';
    el.innerHTML = '<div class="mt-label"></div>';
    (el.firstChild as HTMLElement).textContent = p.you.label;
    extras.current.markers.push(new maplibregl.Marker({ element: el }).setLngLat([p.you.lon, p.you.lat]).addTo(map));
  }
  for (const r of p.rings) {
    const el = document.createElement('div');
    el.className = 'mt-label';
    el.textContent = r.label;
    extras.current.markers.push(new maplibregl.Marker({ element: el }).setLngLat(r.labelAt).addTo(map));
  }
}

// zIndex 0 keeps the map's own layers (controls, markers) under the sheet and buttons drawn after it.
const styles = StyleSheet.create({ fill: { flex: 1 }, layer: { zIndex: 0 } });
