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
    <MapContainer center={[-23.55052, -46.633308]} zoom={13} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {bueiros.map((bueiro, index) => (
        <Marker
          key={index}
          position={[bueiro.latitude, bueiro.longitude]}
          icon={L.divIcon({
            className: 'custom-icon',
            html: `<div style="width:12px;height:12px;border-radius:50%;background:${
              bueiro.status === 'livre' ? 'green' : bueiro.status === 'obstruido' ? 'red' : 'blue'
            }"></div>`,
          })}
        >
          <Popup>
            <strong>Status:</strong> {bueiro.status}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
