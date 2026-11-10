// The map on Android: native MapLibre drawing what src/map/model.ts computed, with the same style
// objects as the web (src/map/style.ts). Photo pins, "you are here" and ring labels are views.
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../theme';
import type { Level } from '../types';
import { baseStyle, OVERLAY_LAYERS } from './style';
import type { MapCanvasProps } from './types';

const EMPTY = { type: 'FeatureCollection' as const, features: [] };
const layers = (source: string) => OVERLAY_LAYERS.filter((l) => 'source' in l && l.source === source);

export function MapCanvas(p: MapCanvasProps) {
  const camera = useRef<CameraRef>(null);

  // A new camera key moves the camera, framing above the sheet.
  useEffect(() => {
    const padding = { top: 72, bottom: p.sheetHeight + 16, left: 24, right: 24 };
    const target = p.camera;
    if ('bounds' in target) camera.current?.fitBounds(target.bounds, { padding, duration: 900 });
    else camera.current?.easeTo({ center: target.center, zoom: target.zoom, padding, duration: 900 });
  }, [p.camera.key]);

  return (
    <Map
      style={StyleSheet.absoluteFill}
      testID="map-canvas"
      mapStyle={baseStyle(p.basemap)}
      logo={false}
      onRegionDidChange={({ nativeEvent: v }) => p.onViewChange({ zoom: v.zoom, bounds: v.bounds, center: v.center })}
    >
      <Camera ref={camera} initialViewState={{ center: [12.37, 45.63], zoom: 1.4 }} />

      <GeoJSONSource
        id="areas"
        data={p.areas}
        onPress={({ nativeEvent }) => {
          const props = nativeEvent.features[0]?.properties as { level: Level; id: string } | undefined;
          if (props) p.onAreaPress(props.level, props.id);
        }}
      >
        {layers('areas').map((l) => <Layer key={l.id} {...l} />)}
      </GeoJSONSource>
      <GeoJSONSource id="journey" data={p.journey ? { type: 'FeatureCollection', features: [p.journey] } : EMPTY}>
        {layers('journey').map((l) => <Layer key={l.id} {...l} />)}
      </GeoJSONSource>
      <GeoJSONSource id="rings" data={{ type: 'FeatureCollection', features: p.rings.map((r) => r.ring) }}>
        {layers('rings').map((l) => <Layer key={l.id} {...l} />)}
      </GeoJSONSource>
      <GeoJSONSource
        id="events"
        data={{
          type: 'FeatureCollection',
          features: p.events.map((e) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lon, e.lat] }, properties: { id: e.id, selected: e.selected } })),
        }}
        onPress={({ nativeEvent }) => {
          const id = nativeEvent.features[0]?.properties?.id as string | undefined;
          if (id) p.onEventPress(id);
        }}
      >
        {layers('events').map((l) => <Layer key={l.id} {...l} />)}
      </GeoJSONSource>

      {/* Pins like the iPhone Photos map: thumbnail, white border, count badge, point under it. */}
      {p.clusters.map((c) => (
        <Marker key={c.key} lngLat={[c.lon, c.lat]} anchor="bottom">
          <Pressable
            onPress={() => (c.count > 1 ? p.onClusterPress(c.key) : p.onPhotoPress(c.coverId))}
            testID="photo-pin"
            accessibilityRole="imagebutton"
            style={styles.pinWrap}
          >
            <View style={styles.pin}>{p.thumbs[c.coverId] ? <Image source={{ uri: p.thumbs[c.coverId] }} style={styles.thumb} /> : null}</View>
            <View style={styles.point} />
            {c.count > 1 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{c.count > 999 ? '999+' : c.count}</Text>
              </View>
            )}
          </Pressable>
        </Marker>
      ))}

      {p.you && (
        <Marker lngLat={[p.you.lon, p.you.lat]} anchor="top">
          <View style={styles.youWrap}>
            <View style={styles.you} />
            <Text style={styles.label}>{p.you.label}</Text>
          </View>
        </Marker>
      )}
      {p.rings.map((r) => (
        <Marker key={r.km} lngLat={r.labelAt}>
          <Text style={styles.label}>{r.km} km</Text>
        </Marker>
      ))}
    </Map>
  );
}

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center', paddingTop: 9, paddingRight: 9 },
  pin: {
    width: 46, height: 46, borderRadius: 10, borderWidth: 2.5, borderColor: '#fff', backgroundColor: '#24323d', overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  point: {
    width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff', marginRight: 9,
  },
  badge: {
    position: 'absolute', top: 0, right: 0, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#111', fontFamily: F.bold, fontSize: 11 },
  youWrap: { alignItems: 'center' },
  you: { width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: '#fff', backgroundColor: '#3d8bff' },
  label: {
    marginTop: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
    backgroundColor: 'rgba(8, 15, 19, 0.85)', color: C.text, fontFamily: F.semi, fontSize: 11,
  },
});
