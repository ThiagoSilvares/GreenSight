import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* Fix dos assets padrão do Leaflet (ok manter mesmo usando divIcon) */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

/* Helpers de normalização */
const isNum = (v) => Number.isFinite(v);
const toFloat = (v) => (v == null ? NaN : parseFloat(v));

const parseWKTPoint = (wkt) => {
  if (typeof wkt !== 'string') return null;
  const m = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(wkt);
  if (!m) return null;
  return { lon: parseFloat(m[1]), lat: parseFloat(m[2]) };
};

const rowToPoint = (row) => {
  // Tenta ler de propriedades comuns
  let lat =
    toFloat(row?.latitude ?? row?.lat ?? row?.y ?? row?.localizacao_lat);
  let lon =
    toFloat(row?.longitude ?? row?.lon ?? row?.lng ?? row?.x ?? row?.localizacao_lon);

  // GeoJSON embutido no próprio row
  if (!isNum(lat) || !isNum(lon)) {
    const coords = row?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      lon = toFloat(coords[0]);
      lat = toFloat(coords[1]);
    }
  }

  // WKT: "POINT(lon lat)"
  if ((!isNum(lat) || !isNum(lon)) && row?.localizacao && typeof row.localizacao === 'string') {
    const p = parseWKTPoint(row.localizacao);
    if (p) {
      lon = p.lon;
      lat = p.lat;
    }
  }

  // Se ainda não conseguiu, desiste
  if (!isNum(lat) || !isNum(lon)) return null;

  return {
    id: row?.id,
    lat,
    lon,
    date: row?.data_monitoramento ?? row?.properties?.data_monitoramento ?? null,
  };
};

const featureToPoint = (f) => {
  try {
    const [lon, lat] = f?.geometry?.coordinates ?? [];
    if (!isNum(parseFloat(lat)) || !isNum(parseFloat(lon))) return null;
    return {
      id: f?.id,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      date: f?.properties?.data_monitoramento ?? null,
    };
  } catch {
    return null;
  }
};

const normalizeToPoints = (data) => {
  if (!data) return [];
  // GeoJSON FeatureCollection
  if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
    return data.features.map(featureToPoint).filter(Boolean);
  }
  // GeoJSON Feature único
  if (data?.type === 'Feature') {
    const p = featureToPoint(data);
    return p ? [p] : [];
  }
  // Array de objetos simples
  if (Array.isArray(data)) {
    return data.map(rowToPoint).filter(Boolean);
  }
  return [];
};

/* =========================
   COMPONENTE PRINCIPAL
   ========================= */
const MapComponent = ({
  bueiros,
  markerColor = '#3b82f6', // azul Tailwind 500
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
              <strong>Bueiro cadastrado</strong><br />
              {p.date && (
                <>
                  <strong>Data:</strong> {new Date(p.date).toLocaleDateString('pt-BR')}<br />
                </>
              )}
              <strong>Latitude:</strong> {p.lat}<br />
              <strong>Longitude:</strong> {p.lon}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
