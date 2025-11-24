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

const socket = io("http://localhost:3000");

// --- CONFIGURACIÓN VISUAL ---
const UNIT_NAMES: { [key: string]: string } = {
  'AMBULANCE': '🚑 Ambulancia',
  'FIRE': '🚒 Bomberos',
  'NATIONAL_POLICE': '🚨 Policía Nacional',
  'MUNICIPAL_POLICE': '🚓 Policía Municipal',
  'CIVIL_GUARD': '🚔 Guardia Civil'
};

const UNIT_CLASSES: { [key: string]: string } = {
  'AMBULANCE': 'ambulance-icon',
  'FIRE': 'fire-icon',
  'NATIONAL_POLICE': 'national-police-icon',
  'MUNICIPAL_POLICE': 'municipal-police-icon',
  'CIVIL_GUARD': 'civil-guard-icon'
};

const getUnitIcon = (type: string, status: string) => {
  let cssClass = UNIT_CLASSES[type] || 'idle-icon';
  return L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: cssClass,
  });
};

const IncidentIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "red-icon",
});

// --- SIDEBAR MEJORADO (Con Selección) ---
interface IncidentListProps {
    incidents: any[];
    loadIncidents: () => void;
    onSelect: (id: string) => void;      // <--- Nueva Prop
    selectedId: string | null;           // <--- Nueva Prop
}

const IncidentList = ({ incidents, loadIncidents, onSelect, selectedId }: IncidentListProps) => {
    
    const handleDispatch = (e: React.MouseEvent, incidentId: string) => {
        e.stopPropagation(); // Evita que al hacer clic en el botón se seleccione el item
        fetch(`http://localhost:3000/api/v1/incidents/${incidentId}/dispatch`, { method: "POST" })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "ERROR") alert("❌ " + data.message);
                else {
                    alert(`✅ Unidad asignada!`);
                    loadIncidents();
                }
            });
    };

    const renderIncidentItem = (inc: any) => {
        const isSelected = selectedId === inc.id;
        
        return (
            <div 
                key={inc.id} 
                // Al hacer clic en la tarjeta, seleccionamos el incidente
                onClick={() => onSelect(inc.id)}
                className={`incident-item status-${inc.status.toLowerCase()} ${isSelected ? 'selected' : ''}`}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: inc.priority === 'HIGH' ? '#FF4D4D' : '#E0E0E0' }}>{inc.title}</strong>
                    <span className={`priority-tag priority-${inc.priority}`}>{inc.priority}</span>
                </div>
                <small style={{ color: '#aaa' }}>{inc.description}</small>
                
                {/* Mensaje de ayuda si está seleccionado */}
                {isSelected && inc.status === "ASSIGNED" && (
                    <div style={{fontSize: '0.8em', color: '#00FFFF', marginTop: '5px', fontStyle: 'italic'}}>
                        👁️ Visualizando ruta
                    </div>
                )}

                <div style={{ marginTop: '5px' }}>
                    {inc.status === "PENDING" && (
                        <button onClick={(e) => handleDispatch(e, inc.id)} style={{ background: '#00FFFF', color: '#1A1A1A', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer' }}>
                            DESPACHAR
                        </button>
                    )}
                    {inc.status === "ASSIGNED" && <span style={{ color: '#00FFFF' }}>Unidad en camino.</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="sidebar">
            <h3 style={{ color: '#E0E0E0', borderBottom: '1px solid #00FFFF', marginBottom: '10px' }}>📋 Incidentes</h3>
            {incidents.map(renderIncidentItem)}
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---
const MapComponent = () => {
  const [units, setUnits] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  
  // ESTADO NUEVO: Cuál incidente está seleccionado actualmente
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentAddress, setNewIncidentAddress] = useState("");
  const [newIncidentPriority, setNewIncidentPriority] = useState("MEDIUM");

  const loadIncidents = () => {
    fetch("http://localhost:3000/api/v1/incidents")
      .then((res) => res.json())
      .then((data) => setIncidents(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadIncidents();
    socket.on("fleetUpdate", (data) => setUnits(data));
    return () => { socket.off("fleetUpdate"); };
  }, []);

  // --- LÓGICA DE RUTA SELECTIVA ---
  useEffect(() => {
    // 1. Si no hay nada seleccionado, borramos la ruta
    if (!selectedIncidentId) {
        setRouteGeometry([]);
        return;
    }

    // 2. Buscamos el incidente seleccionado
    const targetIncident = incidents.find((inc) => inc.id === selectedIncidentId);
    
    // 3. Solo calculamos ruta si existe, está asignado y tiene unidad vinculada
    if (targetIncident && targetIncident.status === "ASSIGNED" && targetIncident.assigned_unit) {
      
      const unit = units.find(u => u.id === targetIncident.assigned_unit.id);

      if (unit) {
        const incLng = targetIncident.location.coordinates[0];
        const incLat = targetIncident.location.coordinates[1];
        const unitLng = unit.lng;
        const unitLat = unit.lat;

        const startParam = `${unitLng},${unitLat}`;
        const endParam = `${incLng},${incLat}`;

        fetch(`http://localhost:3000/api/v1/route?start=${startParam}&end=${endParam}`)
          .then((res) => res.json())
          .then((geometry) => {
            if (geometry) {
              const leafletRoute = geometry.map((point: any[]) => [point[1], point[0]]);
              setRouteGeometry(leafletRoute);
            }
          })
          .catch(console.error);
      }
    } else {
      // Si seleccionas uno PENDING o sin unidad, borramos la ruta anterior
      setRouteGeometry([]);
    }
  }, [units, incidents, selectedIncidentId]); // <--- Dependencia clave: selectedIncidentId

  const handleCreateByAddress = () => {
    if (!newIncidentTitle || !newIncidentAddress) return alert("Faltan datos");

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
      .then((res) => { if(!res.ok) throw new Error("Error"); return res.json(); })
      .then(() => {
        alert("Incidente creado");
        setNewIncidentTitle(''); setNewIncidentAddress(''); loadIncidents();
      })
      .catch((err) => alert(err.message));
  };

  // Handler para seleccionar/deseleccionar
  const handleSelectIncident = (id: string) => {
      if (selectedIncidentId === id) {
          setSelectedIncidentId(null); // Deseleccionar si pulsas el mismo
      } else {
          setSelectedIncidentId(id);
      }
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div className="control-panel">
          <h3>🚨 UrbanPulse | Dispatch</h3>
          <input type="text" placeholder="Título..." value={newIncidentTitle} onChange={(e) => setNewIncidentTitle(e.target.value)} style={{ flexGrow: 1 }} />
          <input type="text" placeholder="Dirección..." value={newIncidentAddress} onChange={(e) => setNewIncidentAddress(e.target.value)} style={{ width: '250px' }} />
          <select value={newIncidentPriority} onChange={(e) => setNewIncidentPriority(e.target.value)}>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
          </select>
          <button onClick={handleCreateByAddress} className="report-button">🔥 REPORTAR</button>
      </div>

      <div className="map-and-sidebar">
          <MapContainer center={[40.416775, -3.70379]} zoom={13} style={{ flexGrow: 1, minHeight: '100%' }}>
              <TileLayer attribution='CartoDB Dark' url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" />

              {units.map((unit) => (
                  <Marker key={unit.id} position={[unit.lat, unit.lng]} icon={getUnitIcon(unit.type, unit.status)}>
                      <Popup>
                          <strong>{UNIT_NAMES[unit.type]}</strong><br/>
                          ID: {unit.name}<br/>
                          Estado: <strong>{unit.status}</strong>
                      </Popup>
                  </Marker>
              ))}

              {incidents.map((inc) => (
                  <Marker key={inc.id} position={[inc.location.coordinates[1], inc.location.coordinates[0]]} icon={IncidentIcon}>
                      <Popup>
                          <strong style={{color: '#FF4D4D'}}>🔥 {inc.title}</strong><br/>
                          Prioridad: {inc.priority}<br/>
                          {inc.status}
                      </Popup>
                  </Marker>
              ))}

              {routeGeometry.length > 0 && (
                  <Polyline positions={routeGeometry} pathOptions={{ color: "#00FFFF", dashArray: "8, 8", weight: 4 }} />
              )}
          </MapContainer>

          <IncidentList 
            incidents={incidents} 
            loadIncidents={loadIncidents} 
            onSelect={handleSelectIncident} // Pasamos la función
            selectedId={selectedIncidentId} // Pasamos el estado
          />
      </div>
    </div>
  );
};

export default MapComponent;