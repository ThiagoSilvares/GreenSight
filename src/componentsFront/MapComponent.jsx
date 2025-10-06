import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const isNum = (v) => Number.isFinite(v);
const toFloat = (v) => (v == null || v === '' ? NaN : parseFloat(v));

const parseWKTPoint = (wkt) => {
  if (typeof wkt !== 'string') return null;
  const m = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(wkt);
  if (!m) return null;
  return { lon: parseFloat(m[1]), lat: parseFloat(m[2]) };
};

const rowToPoint = (row) => {
  let lat = toFloat(row?.latitude ?? row?.lat ?? row?.y ?? row?.localizacao_lat);
  let lon = toFloat(row?.longitude ?? row?.lon ?? row?.lng ?? row?.x ?? row?.localizacao_lon);

  if (!isNum(lat) || !isNum(lon)) {
    const coords = row?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      lon = toFloat(coords[0]);
      lat = toFloat(coords[1]);
    }
  }

  if ((!isNum(lat) || !isNum(lon)) && row?.localizacao && typeof row.localizacao === 'string') {
    const p = parseWKTPoint(row.localizacao);
    if (p) { lon = p.lon; lat = p.lat; }
  }

  if (!isNum(lat) || !isNum(lon)) return null;

  const conf = toFloat(
    row?.conf ??
    row?.conf_last ??               
    row?.confidence ??
    row?.properties?.conf ??
    row?.properties?.confidence
  );

  return {
    id: row?.id,
    lat,
    lon,
    date: row?.data_monitoramento ?? row?.properties?.data_monitoramento ?? null,
    conf: isNum(conf) ? conf : null,
  };
};

const featureToPoint = (f) => {
  try {
    const [lonRaw, latRaw] = f?.geometry?.coordinates ?? [];
    const lat = toFloat(latRaw);
    const lon = toFloat(lonRaw);
    if (!isNum(lat) || !isNum(lon)) return null;

    const conf = toFloat(
      f?.properties?.conf ??
      f?.properties?.conf_last ??
      f?.properties?.confidence
    );

    return {
      id: f?.id,
      lat,
      lon,
      date: f?.properties?.data_monitoramento ?? null,
      conf: isNum(conf) ? conf : null,
    };
  } catch {
    return null;
  }
};

const normalizeToPoints = (data) => {
  if (!data) return [];
  if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
    return data.features.map(featureToPoint).filter(Boolean);
  }
  if (data?.type === 'Feature') {
    const p = featureToPoint(data);
    return p ? [p] : [];
  }
  if (Array.isArray(data)) {
    return data.map(rowToPoint).filter(Boolean);
  }
  return [];
};

const MapComponent = ({
  bueiros,
  markerColor = '#3b82f6',
  center = [-23.64601, -46.5759],
  zoom = 17,
  height = 500,
}) => {
  const pontos = normalizeToPoints(bueiros);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: `${height}px`, width: '100%' }}
      className="z-0 rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {pontos.map((p, idx) => (
        <Marker
          key={p.id ?? idx}
          position={[p.lat, p.lon]}
          icon={L.divIcon({
            className: 'custom-icon',
            html: `<div style="
              width:14px;
              height:14px;
              border-radius:50%;
              background:${markerColor};
              border:1px solid white;
              box-shadow:0 0 8px rgba(0,0,0,0.6);
            "></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })}
        >
          <Popup>
            <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
              {p.date && (
                <>
                  <strong>Data:</strong> {new Date(p.date).toLocaleDateString('pt-BR')}<br />
                </>
              )}
              <strong>Latitude:</strong> {p.lat}<br />
              <strong>Longitude:</strong> {p.lon}<br />
              {p.conf != null && (
                <>
                  <strong>Confiança:</strong> {Number(p.conf).toFixed(2)}
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
