import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const isNum = (v) => Number.isFinite(v);
const toFloat = (v) => (v == null ? NaN : parseFloat(v));

const parseWKTPoint = (wkt) => {
  if (typeof wkt !== "string") return null;
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
  if ((!isNum(lat) || !isNum(lon)) && typeof row?.localizacao === "string") {
    const p = parseWKTPoint(row.localizacao);
    if (p) { lon = p.lon; lat = p.lat; }
  }
  if (!isNum(lat) || !isNum(lon)) return null;

  return {
    id: row?.id,
    lat,
    lon,
    date: row?.data_monitoramento ?? row?.properties?.data_monitoramento ?? null,
    conf: row?.conf ?? row?.properties?.conf ?? null,
    image_url: row?.image_url ?? row?.properties?.image_url ?? null,
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
      conf: f?.properties?.conf ?? null,
      image_url: f?.properties?.image_url ?? null,
    };
  } catch {
    return null;
  }
};

const normalizeToPoints = (data) => {
  if (!data) return [];
  if (data?.type === "FeatureCollection" && Array.isArray(data.features)) {
    return data.features.map(featureToPoint).filter(Boolean);
  }
  if (data?.type === "Feature") {
    const p = featureToPoint(data);
    return p ? [p] : [];
  }
  if (Array.isArray(data)) {
    return data.map(rowToPoint).filter(Boolean);
  }
  return [];
};

const fmtConf = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
};

function AutoFit({ pontos }) {
  const map = useMap();
  useEffect(() => {
    if (!pontos?.length) return;
    const bounds = L.latLngBounds(pontos.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds.pad(0.2), { animate: true });
  }, [pontos, map]);
  return null;
}

function FlyToControl({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo && Number.isFinite(flyTo.lat) && Number.isFinite(flyTo.lon)) {
      map.flyTo([flyTo.lat, flyTo.lon], flyTo.zoom ?? 18, { animate: true, duration: 0.8 });
    }
  }, [flyTo, map]);
  return null;
}

export default function MapComponent({
  bueiros,
  markerColor = "#3b82f6",
  highlightColor = "#22c55e",
  highlightedId = null,
  flyTo = null,
  center = [-23.64601, -46.5759],
  zoom = 15,
  height = 500,
  autoRefreshMs = 5000,
  apiBase = import.meta?.env?.VITE_API_BASE || "http://localhost:3001/api",
  onPointsLoaded = () => {},
}) {
  const [pontos, setPontos] = useState([]);
  const pollingRef = useRef(null);

  const apiOrigin = useMemo(
    () => apiBase.replace(/\/api\/?$/, ""),
    [apiBase]
  );

  const divIcon = useMemo(
    () =>
      (color) =>
        L.divIcon({
          className: "custom-icon",
          html: `<div style="
              width:14px;height:14px;border-radius:50%;
              background:${color};
              border:1px solid white;box-shadow:0 0 8px rgba(0,0,0,0.6);
            "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
    []
  );

  const attachImgUrl = (pts) =>
    pts.map((p) => {
      let url = p.image_url;
      if (!url && p.id) {
        url = `/api/bueiros/${p.id}/imagem`;
      }
      if (!url) return p;

      if (url.startsWith("http")) {
        return { ...p, image_url: url };
      }
      if (url.startsWith("/")) {
        return { ...p, image_url: `${apiOrigin}${url}` };
      }
      return { ...p, image_url: `${apiBase.replace(/\/$/, "")}/${url}` };
    });

  const loadFromApi = async () => {
    try {
      const r = await fetch(`${apiBase}/bueiros`);
      if (!r.ok) throw new Error("GET /bueiros falhou");
      const json = await r.json();
      const data = Array.isArray(json) ? json : json?.bueiros ?? [];
      const pts = attachImgUrl(normalizeToPoints(data));
      setPontos(pts);
      onPointsLoaded(pts);
    } catch (e) {
      console.error("Erro carregando bueiros:", e);
    }
  };

  useEffect(() => {
    if (bueiros) {
      const pts = attachImgUrl(normalizeToPoints(bueiros));
      setPontos(pts);
      onPointsLoaded(pts);
    }
  }, [bueiros, apiOrigin, apiBase]); //eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bueiros) return;
    loadFromApi();
    if (autoRefreshMs > 0) {
      pollingRef.current = setInterval(loadFromApi, autoRefreshMs);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [apiBase, autoRefreshMs, !!bueiros]); //eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bueiros) return;
    const handler = () => loadFromApi();
    window.addEventListener("bueiro:created", handler);
    return () => window.removeEventListener("bueiro:created", handler);
  }, [apiBase, !!bueiros]); //eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: `${height}px`, width: "100%" }}
      className="z-0 rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <AutoFit pontos={pontos} />
      <FlyToControl flyTo={flyTo} />

      {pontos.map((p, idx) => (
        <Marker
          key={p.id ?? `${p.lat},${p.lon},${idx}`}
          position={[p.lat, p.lon]}
          icon={divIcon((highlightedId && (highlightedId === p.id || highlightedId === `${p.lat},${p.lon}`)) ? highlightColor : markerColor)}
        >
          <Popup>
            <div style={{ fontSize: "14px", lineHeight: "1.6", maxWidth: 280 }}>
              <br />
              {p.date && (
                <>
                  <strong>Data:</strong>{" "}
                  {new Date(p.date).toLocaleString("pt-BR")}
                  <br />
                </>
              )}
              <strong>Latitude:</strong> {p.lat}
              <br />
              <strong>Longitude:</strong> {p.lon}
              <br />
              <strong>Conf:</strong> {fmtConf(p.conf)}
              {p.image_url && (
                <>
                  <br />
                  <img
                    src={p.image_url}
                    alt="Bueiro"
                    style={{
                      width: "100%",
                      maxWidth: 260,
                      height: "auto",
                      marginTop: 8,
                      borderRadius: 8,
                      display: "block",
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
