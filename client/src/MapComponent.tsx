import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix iconos
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// URL del Backend
const socket = io('http://localhost:3000');

const MapComponent = () => {
  // Estado inicial: Madrid
  const [position, setPosition] = useState<[number, number]>([40.416775, -3.703790]);

  useEffect(() => {
    // Escuchar el evento 'positionUpdate' del servidor
    socket.on('positionUpdate', (data) => {
      console.log('Nueva posición recibida:', data);
      // Actualizar el estado mueve el marcador automáticamente
      setPosition(data.position);
    });

    return () => {
      socket.off('positionUpdate');
    };
  }, []);

  return (
    <MapContainer center={position} zoom={15} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* El marcador usa la variable de estado 'position' */}
      <Marker position={position}>
        <Popup>
          Unidad en Movimiento <br />
          Lat: {position[0].toFixed(4)} <br />
          Lng: {position[1].toFixed(4)}
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default MapComponent;