import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  // useMapEvents, // Ya no es necesario para crear incidentes por clic
  Polyline,
} from "react-leaflet";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// --- CONFIGURACIÓN DE ICONOS ---

const getUnitIcon = (status: string) => {
  let filterClass = "idle-icon";

  if (status === "BUSY" || status === "ASSIGNED") {
    filterClass = "busy-icon"; // Rojo/Rosa (según tu CSS)
  } else if (status === "OFFLINE") {
    filterClass = "offline-icon"; // Gris
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

// URL del Backend
const socket = io("http://localhost:3000");

// --- COMPONENTE PRINCIPAL ---
const MapComponent = () => {
  const [position, setPosition] = useState<[number, number]>([
    40.416775, -3.70379,
  ]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [unitStatus, setUnitStatus] = useState<string>("IDLE");
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);

  // NUEVO ESTADO PARA GEOCODIFICACIÓN
  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentAddress, setNewIncidentAddress] = useState("");
  const [newIncidentPriority, setNewIncidentPriority] = useState("MEDIUM"); // Default

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
      // Incidente (estático): [lng, lat]
      const incLngLat = assignedIncident.location.coordinates;

      // Ambulancia (dinámico): [lat, lng] -> Necesitamos revertir a [lng, lat] para el API
      const unitLngLat = [position[1], position[0]];

      // Construimos los parámetros: OSRM espera Lng,Lat
      const startParam = `${unitLngLat[0]},${unitLngLat[1]}`;
      const endParam = `${incLngLat[0]},${incLngLat[1]}`;

      // Llamamos a nuestro nuevo endpoint
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
      setRouteGeometry([]); // Limpiar la ruta si no hay asignados
    }
  }, [position, incidents]);

  // NUEVA FUNCIÓN PARA CREAR INCIDENTE POR DIRECCIÓN (Geocodificación)
  const handleCreateByAddress = () => {
    if (!newIncidentTitle || !newIncidentAddress) {
      alert("Por favor, introduce título y dirección.");
      return;
    }

    fetch("http://localhost:3000/api/v1/incident-by-address", { // NUEVO ENDPOINT
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newIncidentTitle,
        description: `Reportado vía formulario: ${newIncidentAddress}`,
        address: newIncidentAddress,
        priority: newIncidentPriority, // Añadimos la prioridad
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
        loadIncidents(); // Recargar el mapa para ver el nuevo incidente
      })
      .catch((err) => alert(`Error al crear incidente: ${err.message}. Asegúrate de que la dirección es válida.`));
  };


  return (
    <div>
        {/* --- FORMULARIO DE CREACIÓN PROFESIONAL (UX) --- */}
        <div style={{ padding: '15px', backgroundColor: '#f0f0f0', borderBottom: '2px solid #ccc', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <h3>🚨 Reportar Incidente</h3>
            <input
                type="text"
                placeholder="Título (Ej: Incendio en fábrica)"
                value={newIncidentTitle}
                onChange={(e) => setNewIncidentTitle(e.target.value)}
                style={{ padding: '8px', border: '1px solid #aaa', borderRadius: '4px', flexGrow: 1 }}
            />
            <input
                type="text"
                placeholder="Dirección completa (Ej: Calle Mayor 1, Madrid)"
                value={newIncidentAddress}
                onChange={(e) => setNewIncidentAddress(e.target.value)}
                style={{ padding: '8px', border: '1px solid #aaa', borderRadius: '4px', width: '300px' }}
            />
            <select
                value={newIncidentPriority}
                onChange={(e) => setNewIncidentPriority(e.target.value)}
                style={{ padding: '8px', border: '1px solid #aaa', borderRadius: '4px' }}
            >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
            </select>
            <button 
                onClick={handleCreateByAddress}
                style={{ padding: '8px 16px', backgroundColor: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                🔥 Reportar
            </button>
        </div>
        {/* --- MAPA --- */}
        <MapContainer
          center={[40.416775, -3.70379]}
          zoom={14}
          style={{ height: "500px", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* El LocationMarker original ha sido eliminado */}

          {/* MARCADOR 1: La Ambulancia (Color Dinámico) */}
          <Marker position={position} icon={getUnitIcon(unitStatus)}>
            <Popup>
              🚑 UNIDAD-01 <br />
              Estado: <strong>{unitStatus}</strong>
            </Popup>
          </Marker>

          {/* MARCADORES 2: Los Incidentes (Rojos) */}
          {incidents.map((inc) => (
            <Marker
              key={inc.id}
              position={[inc.location.coordinates[1], inc.location.coordinates[0]]}
              icon={IncidentIcon}
            >
              <Popup>
                <strong>🔥 {inc.title}</strong> <br />
                Prioridad: <strong>{inc.priority}</strong> <br />
                {inc.description} <br />
                <small>{new Date(inc.created_at).toLocaleTimeString()}</small>
                <hr
                  style={{
                    margin: "8px 0",
                    border: "0",
                    borderTop: "1px solid #ccc",
                  }}
                />
                {/* --- LÓGICA DE DESPACHO --- */}
                {inc.status === "PENDING" ? (
                  <button
                    style={{
                      width: "100%",
                      backgroundColor: "#ff4d4f",
                      color: "white",
                      border: "none",
                      padding: "6px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                    onClick={() => {
                      fetch(
                        `http://localhost:3000/api/v1/incidents/${inc.id}/dispatch`,
                        { method: "POST" }
                      )
                        .then((res) => res.json())
                        .then((data) => {
                          if (data.status === "ERROR") {
                            alert("❌ " + data.message);
                          } else {
                            alert(`✅ Unidad asignada correctamente!`);
                            loadIncidents();
                          }
                        })
                        .catch((err) => console.error(err));
                    }}
                  >
                    🚨 DESPACHAR UNIDAD
                  </button>
                ) : (
                  <div
                    style={{
                      color: "green",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    ✅ Unidad En Camino
                  </div>
                )}
              </Popup>
            </Marker>
          ))}

          {/* DIBUJO DE LA RUTA REAL (Polyline complejo) */}
          {routeGeometry.length > 0 && (
            <Polyline
              positions={routeGeometry}
              pathOptions={{ color: "#007bff", dashArray: "8, 8", weight: 4 }}
            />
          )}
        </MapContainer>
    </div>
  );
};

export default MapComponent;