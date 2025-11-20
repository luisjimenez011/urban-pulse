import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// URL del Backend
const socket = io("http://localhost:3000");

// --- CONFIGURACIÓN DE ICONOS ---

const getUnitIcon = (status: string) => {
  let filterClass = "idle-icon";

  if (status === "BUSY" || status === "ASSIGNED") {
    filterClass = "busy-icon";
  } else if (status === "OFFLINE") {
    filterClass = "offline-icon";
  }

  return L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: filterClass,
  });
};

// Icono de Incidente (Rojo)
const IncidentIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "red-icon",
});


// --- COMPONENTE PARA RENDERIZAR LA LISTA DE INCIDENTES EN EL SIDEBAR ---
const IncidentList = ({ incidents, loadIncidents }: { incidents: any[], loadIncidents: () => void }) => {
    // Función para despachar
    const handleDispatch = (incidentId: string) => {
        fetch(`http://localhost:3000/api/v1/incidents/${incidentId}/dispatch`, { method: "POST" })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "ERROR") {
                    alert("❌ " + data.message);
                } else {
                    alert(`✅ Unidad asignada a incidente ${incidentId}!`);
                    loadIncidents();
                }
            })
            .catch((err) => console.error(err));
    };

    const pendingIncidents = incidents.filter(inc => inc.status === 'PENDING');
    const assignedIncidents = incidents.filter(inc => inc.status === 'ASSIGNED');
    const resolvedIncidents = incidents.filter(inc => inc.status === 'RESOLVED');

    const renderIncidentItem = (inc: any) => (
        <div key={inc.id} className={`incident-item status-${inc.status.toLowerCase()}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: inc.priority === 'HIGH' ? '#FF4D4D' : '#E0E0E0' }}>{inc.title}</strong>
                <span className={`priority-tag priority-${inc.priority}`}>
                    {inc.priority}
                </span>
            </div>
            <small style={{ color: '#aaa' }}>{new Date(inc.created_at).toLocaleTimeString()} - {inc.description}</small>
            <div style={{ marginTop: '5px' }}>
                {inc.status === "PENDING" && (
                    <button 
                        onClick={() => handleDispatch(inc.id)}
                        style={{ background: '#00FFFF', color: '#1A1A1A', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', marginTop: '5px' }}
                    >
                        DESPACHAR
                    </button>
                )}
                {inc.status === "ASSIGNED" && (
                    <span style={{ color: '#00FFFF' }}>Unidad en ruta.</span>
                )}
                {inc.status === "RESOLVED" && (
                    <span style={{ color: '#4CAF50' }}>Resuelto.</span>
                )}
            </div>
        </div>
    );

    return (
        <div className="sidebar">
            <h3 style={{ color: '#E0E0E0', borderBottom: '1px solid #00FFFF', paddingBottom: '10px' }}>
                📋 Estado de Incidentes
            </h3>
            
            <h4 style={{ color: '#FF4D4D' }}>PENDIENTES ({pendingIncidents.length})</h4>
            {pendingIncidents.length > 0 ? pendingIncidents.map(renderIncidentItem) : <p style={{color: '#888'}}>Sin incidentes pendientes. ✅</p>}

            <h4 style={{ color: '#00FFFF', marginTop: '20px' }}>ASIGNADOS ({assignedIncidents.length})</h4>
            {assignedIncidents.length > 0 ? assignedIncidents.map(renderIncidentItem) : <p style={{color: '#888'}}>Sin unidades en servicio.</p>}
            
            <h4 style={{ color: '#4CAF50', marginTop: '20px' }}>RESUELTOS ({resolvedIncidents.length})</h4>
            {/* Opcional: Puedes mostrar un resumen de los resueltos aquí */}
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---
const MapComponent = () => {
  const [position, setPosition] = useState<[number, number]>([
    40.416775, -3.70379,
  ]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [unitStatus, setUnitStatus] = useState<string>("IDLE");
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);

  // ESTADO PARA GEOCODIFICACIÓN
  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentAddress, setNewIncidentAddress] = useState("");
  const [newIncidentPriority, setNewIncidentPriority] = useState("MEDIUM");

  const loadIncidents = () => {
    fetch("http://localhost:3000/api/v1/incidents")
      .then((res) => res.json())
      .then((data) => setIncidents(data))
      .catch((err) => console.error("Error cargando incidentes:", err));
  };

  useEffect(() => {
    loadIncidents();

    socket.on("positionUpdate", (data) => {
      setPosition(data.position);
      setUnitStatus(data.status);
    });

    return () => {
      socket.off("positionUpdate");
    };
  }, []);

  // Hook para calcular y dibujar la ruta REAL (OSRM)
  useEffect(() => {
    const assignedIncident = incidents.find((inc) => inc.status === "ASSIGNED");

    if (assignedIncident) {
      const incLngLat = assignedIncident.location.coordinates;
      const unitLngLat = [position[1], position[0]];

      const startParam = `${unitLngLat[0]},${unitLngLat[1]}`;
      const endParam = `${incLngLat[0]},${incLngLat[1]}`;

      fetch(
        `http://localhost:3000/api/v1/route?start=${startParam}&end=${endParam}`
      )
        .then((res) => res.json())
        .then((geometry) => {
          if (geometry) {
            // OSRM devuelve [Lng, Lat], Leaflet necesita [Lat, Lng]
            const leafletRoute = geometry.map((point: any[]) => [point[1], point[0]]);
            setRouteGeometry(leafletRoute);
          }
        })
        .catch((err) => console.error("Error al obtener la ruta:", err));
    } else {
      setRouteGeometry([]);
    }
  }, [position, incidents]);

  // FUNCIÓN PARA CREAR INCIDENTE POR DIRECCIÓN (Geocodificación)
  const handleCreateByAddress = () => {
    if (!newIncidentTitle || !newIncidentAddress) {
      alert("Por favor, introduce título y dirección.");
      return;
    }

    
    fetch("http://localhost:3000/api/v1/incident-by-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newIncidentTitle,
        description: `Reportado vía formulario: ${newIncidentAddress}`,
        address: newIncidentAddress,
        priority: newIncidentPriority,
      }),
    })
      .then((res) => {
        if (!res.ok) {
            return res.json().then(error => { throw new Error(error.message || 'Error desconocido'); });
        }
        return res.json();
      })
      .then(() => {
        alert(`Incidente "${newIncidentTitle}" (Prioridad: ${newIncidentPriority}) creado.`);
        setNewIncidentTitle('');
        setNewIncidentAddress('');
        setNewIncidentPriority('MEDIUM');
        loadIncidents();
      })
      .catch((err) => alert(`Error al crear incidente: ${err.message}. Asegúrate de que la dirección es válida.`));
  };


  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* --- 1. PANEL DE CONTROL SUPERIOR (Header) --- */}
      <div className="control-panel">
          <h3>🚨 UrbanPulse | Dispatch Center</h3>
          <input
              type="text"
              placeholder="Título (Ej: Incendio en fábrica)"
              value={newIncidentTitle}
              onChange={(e) => setNewIncidentTitle(e.target.value)}
              style={{ flexGrow: 1 }}
          />
          <input
              type="text"
              placeholder="Dirección completa (Ej: Calle Mayor 1, Madrid)"
              value={newIncidentAddress}
              onChange={(e) => setNewIncidentAddress(e.target.value)}
              style={{ width: '250px' }}
          />
          <select
              value={newIncidentPriority}
              onChange={(e) => setNewIncidentPriority(e.target.value)}
          >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
          </select>
          <button 
              onClick={handleCreateByAddress}
              className="report-button"
          >
              🔥 REPORTAR EMERGENCIA
          </button>
      </div>

      {/* --- 2. CONTENIDO PRINCIPAL: MAPA + SIDEBAR --- */}
      <div className="map-and-sidebar">
          <MapContainer
              center={[40.416775, -3.70379]}
              zoom={14}
              style={{ flexGrow: 1, minHeight: '100%' }}
          >
              {/* Capa base oscura de CartoDB para un look tecnológico */}
              <TileLayer
                  attribution='&copy; <a href="http://osm.org/copyright">OSM</a> | CartoDB Dark'
                  url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" 
              />

              {/* MARCADOR 1: La Ambulancia */}
              <Marker position={position} icon={getUnitIcon(unitStatus)}>
                  <Popup>
                      🚑 UNIDAD-01 <br />
                      Estado: <strong>{unitStatus}</strong>
                  </Popup>
              </Marker>

              {/* MARCADORES 2: Los Incidentes */}
              {incidents.map((inc) => (
                  <Marker
                      key={inc.id}
                      position={[inc.location.coordinates[1], inc.location.coordinates[0]]}
                      icon={IncidentIcon}
                  >
                      <Popup>
                          <strong style={{color: inc.priority === 'HIGH' ? '#FF4D4D' : '#00FFFF'}}>
                              🔥 {inc.title}
                          </strong> <br />
                          Prioridad: <span style={{fontWeight: 'bold'}}>{inc.priority}</span> <br />
                          <small>{new Date(inc.created_at).toLocaleTimeString()}</small>
                          <hr style={{ borderTop: "1px solid #ccc" }}/>
                          {/* Muestra solo el estado dentro del popup */}
                          {inc.status === "PENDING" ? (
                              <span style={{ color: '#FF4D4D', fontWeight: 'bold' }}>PENDIENTE</span>
                          ) : (
                              <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{inc.status}</span>
                          )}
                      </Popup>
                  </Marker>
              ))}

              {/* DIBUJO DE LA RUTA REAL */}
              {routeGeometry.length > 0 && (
                  <Polyline
                      positions={routeGeometry}
                      pathOptions={{ color: "#00FFFF", dashArray: "8, 8", weight: 4 }} 
                  />
              )}
          </MapContainer>

          {/* --- SIDEBAR: LISTA DE ESTADO DE INCIDENTES --- */}
          <IncidentList 
              incidents={incidents} 
              loadIncidents={loadIncidents} 
          />
      </div>
    </div>
  );
};

export default MapComponent;