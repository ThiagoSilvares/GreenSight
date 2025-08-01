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

const MapComponent = ({ bueiros }) => {
  return (
    <MapContainer
      center={[-23.64601, -46.57590]}
      zoom={17}
      style={{ height: '500px', width: '100%' }}
      className="z-0 rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {bueiros && bueiros.length > 0 && bueiros.map((bueiro, index) => {
        const { latitude, longitude, status, percentual_obstrucao, data_monitoramento } = bueiro;

        if (!latitude || !longitude) return null;

        return (
          <Marker
            key={index}
            position={[parseFloat(latitude), parseFloat(longitude)]}
            icon={L.divIcon({
              className: 'custom-icon',
              html: `<div style="
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: ${
                  status === 'limpo'
                    ? '#22c55e'
                    : status === 'obstruido'
                    ? '#ef4444' 
                    : '#3b82f6' 
                };
                border: 1px solid white;
                box-shadow: 0 0 8px rgba(0,0,0,0.6);
                transform: translate(-50%, -50%);
              "></div>`,
              iconSize: [24, 24],
            })}
          >
            <Popup>
              <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                <strong>Status:</strong> {status} <br />
                {percentual_obstrucao !== null && (
                  <>
                    <strong>Obstrução:</strong> {percentual_obstrucao}% <br />
                  </>
                )}
                {data_monitoramento && (
                  <>
                    <strong>Data:</strong>{' '}
                    {new Date(data_monitoramento).toLocaleDateString('pt-BR')} <br />
                  </>
                )}
                <strong>Latitude:</strong> {latitude} <br />
                <strong>Longitude:</strong> {longitude}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;
