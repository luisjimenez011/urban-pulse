import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// --- CONFIGURACIÓN DE ICONOS ---

// 1. Icono Azul (Ambulancia)
const AmbulanceIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// 2. Icono Rojo (Incidente)
const IncidentIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: 'red-icon' 
});

// URL del Backend
const socket = io('http://localhost:3000');

// --- COMPONENTE PARA CLICS ---
const LocationMarker = ({ refreshIncidents }: { refreshIncidents: () => void }) => {
  useMapEvents({
    click(e) {
      const title = prompt("¿Qué emergencia es? (ej: Incendio)");
      if (title) {
        fetch('http://localhost:3000/api/v1/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title,
            description: 'Reportado por usuario',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          })
        })
        .then(res => res.json())
        .then(() => {
          alert("Incidente reportado");
          refreshIncidents(); 
        });
      }
    },
  });
  return null;
};

// --- COMPONENTE PRINCIPAL ---
const MapComponent = () => {
  const [position, setPosition] = useState<[number, number]>([40.416775, -3.703790]);
  const [incidents, setIncidents] = useState<any[]>([]); 

  const loadIncidents = () => {
    fetch('http://localhost:3000/api/v1/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data))
      .catch(err => console.error("Error cargando incidentes:", err));
  };

  useEffect(() => {
    loadIncidents();

    socket.on('positionUpdate', (data) => {
      setPosition(data.position);
    });

    return () => {
      socket.off('positionUpdate');
    };
  }, []);

  return (
    <MapContainer center={[40.416775, -3.703790]} zoom={14} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <LocationMarker refreshIncidents={loadIncidents} />

      {/* MARCADOR 1: La Ambulancia (Azul) */}
      <Marker position={position} icon={AmbulanceIcon}>
        <Popup>🚑 UNIDAD-01 (En movimiento)</Popup>
      </Marker>

      {/* MARCADORES 2: Los Incidentes (Rojos) */}
      {incidents.map((inc) => (
        <Marker 
          key={inc.id}
          position={[inc.location.coordinates[1], inc.location.coordinates[0]]}
          icon={IncidentIcon}
        >
          <Popup>
            <strong>🔥 {inc.title}</strong> <br/>
            {inc.description} <br/>
            <small>{new Date(inc.created_at).toLocaleTimeString()}</small>
            <hr style={{margin: '8px 0', border: '0', borderTop: '1px solid #ccc'}}/>
            
            {/* --- AQUÍ ESTÁ LA LÓGICA NUEVA --- */}
            {inc.status === 'PENDING' ? (
               <button 
                 style={{
                   width: '100%',
                   backgroundColor: '#ff4d4f',
                   color: 'white',
                   border: 'none',
                   padding: '6px',
                   borderRadius: '4px',
                   cursor: 'pointer',
                   fontWeight: 'bold'
                 }}
                 onClick={() => {
                   // 1. Petición al endpoint de despacho
                   fetch(`http://localhost:3000/api/v1/incidents/${inc.id}/dispatch`, { method: 'POST' })
                     .then(res => res.json())
                     .then(data => {
                        // 2. Manejo de respuesta
                        if(data.status === 'ERROR') {
                           alert('❌ ' + data.message); // "No hay unidades disponibles"
                        } else {
                           alert(`✅ Unidad asignada correctamente!`);
                           loadIncidents(); // 3. Recargar mapa para ver el cambio
                        }
                     })
                     .catch(err => console.error(err));
                 }}
               >
                 🚨 DESPACHAR UNIDAD
               </button>
            ) : (
               <div style={{color: 'green', fontWeight: 'bold', textAlign: 'center'}}>
                 ✅ Unidad En Camino
               </div>
            )}

          </Popup>
        </Marker>
      ))}

    </MapContainer>
  );
};

export default MapComponent;