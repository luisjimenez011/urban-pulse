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
    units: any[]; // Se requiere para contar la disponibilidad
    loadIncidents: () => void;
    onSelect: (id: string) => void; 
    selectedId: string | null; 
}

const UNIT_TYPES = Object.keys(UNIT_NAMES);


const IncidentList = ({ incidents, units, loadIncidents, onSelect, selectedId }: IncidentListProps) => {

    // 1. Calcular la disponibilidad de unidades
    // Agrupa y cuenta las unidades 'IDLE' (ociosas/libres) por tipo
    const availableUnits = units.reduce((acc, unit) => {
        if (unit.status === 'IDLE') {
            acc[unit.type] = (acc[unit.type] || 0) + 1;
        }
        return acc;
    }, {} as { [key: string]: number });


    // --- LÓGICA DE DESPACHO CON SELECTOR ---
    const handleDispatch = (e: React.FormEvent, incidentId: string) => {
        e.preventDefault();
        // Accedemos al valor del selector dentro del formulario
        const target = e.target as typeof e.target & {
            unitSelector: { value: string };
        };
        
        const unitType = target.unitSelector.value;
        
        if (!unitType || unitType === '') {
            return alert("❌ Por favor, selecciona un tipo de unidad.");
        }
        
        // Si no hay unidades disponibles, alertamos y detenemos el proceso
        if (availableUnits[unitType] === 0) {
            return alert(`❌ No hay unidades ${UNIT_NAMES[unitType]} disponibles (IDLE) en este momento.`);
        }

        // 2. Llamar al endpoint con el tipo en el Body
        fetch(`http://localhost:3000/api/v1/incidents/${incidentId}/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unitType }), // <-- Enviar el tipo
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "ERROR") alert("❌ " + data.message);
                else {
                    alert(`✅ ${UNIT_NAMES[unitType]} asignada!`);
                    loadIncidents(); // Recargar datos para ver la nueva asignación
                }
            })
            .catch((err) => {
                 console.error("Error al despachar:", err);
                 alert("Ocurrió un error al intentar despachar la unidad.");
            });
    };

    const renderIncidentItem = (inc: any) => {
        const isSelected = selectedId === inc.id;
        const isAssigned = inc.assignments && inc.assignments.length > 0;
        const assignmentCount = isAssigned ? inc.assignments.length : 0;

        return (
            <div
                key={inc.id}
                onClick={() => onSelect(inc.id)}
                className={`incident-item status-${inc.status.toLowerCase()} ${isSelected ? 'selected' : ''}`}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: inc.priority === 'HIGH' ? '#FF4D4D' : '#E0E0E0' }}>{inc.title}</strong>
                    <span className={`priority-tag priority-${inc.priority}`}>{inc.priority}</span>
                </div>
                <small style={{ color: '#aaa' }}>{inc.description}</small>

                {/* Muestra la lista de unidades asignadas si el incidente está seleccionado */}
                {isSelected && isAssigned && (
                    <div style={{ fontSize: '0.8em', color: '#00FFFF', marginTop: '5px' }}>
                        👁️ **Visualizando {assignmentCount} ruta(s):**
                        <ul>
                            {inc.assignments.map((assignment: any) => (
                                <li key={assignment.id} style={{ listStyleType: 'disc', marginLeft: '15px' }}>
                                    {UNIT_NAMES[assignment.unit.type] || assignment.unit.type} ({assignment.unit.name})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {/* FORMULARIO DE DESPACHO CON SELECTOR */}
                <form onSubmit={(e) => handleDispatch(e, inc.id)} style={{ display: 'flex', marginTop: '5px', gap: '5px' }}>
                    <select 
                        name="unitSelector" 
                        style={{ flexGrow: 1, padding: '4px', borderRadius: '3px', background: '#333', color: '#E0E0E0', border: '1px solid #00FFFF' }}
                    >
                        <option value="">--- Seleccionar Unidad ---</option>
                        {UNIT_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {UNIT_NAMES[type]} ({availableUnits[type] || 0} disponibles) 
                            </option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        style={{ background: '#00FFFF', color: '#1A1A1A', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer' }}
                    >
                        ASIGNAR
                    </button>
                </form>
            </div>
        );
    };

    return (
        <div className="sidebar">
            <h3 style={{ color: '#E0E0E0', borderBottom: '1px solid #00FFFF', marginBottom: '10px' }}>📋 Incidentes</h3>
            {/* Array.isArray para robustez */}
            {Array.isArray(incidents) && incidents.map(renderIncidentItem)}
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---
const MapComponent = () => {
    const [units, setUnits] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [routeGeometry, setRouteGeometry] = useState<[number, number][][]>([]); 

    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

    const [newIncidentTitle, setNewIncidentTitle] = useState("");
    const [newIncidentAddress, setNewIncidentAddress] = useState("");
    const [newIncidentPriority, setNewIncidentPriority] = useState("MEDIUM");

    // Función de carga con manejo de error HTTP mejorado
    const loadIncidents = () => {
        fetch("http://localhost:3000/api/v1/incidents")
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => setIncidents(data))
            .catch((err) => {
                console.error("Error al cargar incidentes:", err);
                // Mantenemos incidents como array vacío si falla la carga.
            });
    };

    useEffect(() => {
        loadIncidents();
        socket.on("fleetUpdate", (data) => setUnits(data));
        return () => { socket.off("fleetUpdate"); };
    }, []);

    // --- LÓGICA DE RUTA SELECTIVA Y MÚLTIPLE ---
    useEffect(() => {
        if (!selectedIncidentId) {
            setRouteGeometry([]);
            return;
        }

        const targetIncident = incidents.find((inc) => inc.id === selectedIncidentId);

        if (targetIncident && targetIncident.assignments && targetIncident.assignments.length > 0) {
            
            const routePromises = targetIncident.assignments.map((assignment: any) => {

                // Buscamos la unidad viva en la lista global 'units' (que se actualiza por socket)
                const unit = units.find(u => u.id === assignment.unit.id); 

                if (unit) {
                    const incLng = targetIncident.location.coordinates[0];
                    const incLat = targetIncident.location.coordinates[1];
                    const unitLng = unit.lng;
                    const unitLat = unit.lat;

                    // OSRM espera Lng,Lat
                    const startParam = `${unitLng},${unitLat}`;
                    const endParam = `${incLng},${incLat}`;

                    return fetch(`http://localhost:3000/api/v1/route?start=${startParam}&end=${endParam}`)
                        .then((res) => res.json())
                        .then((geometry) => {
                            // Convertir la geometría de OSRM (Lng, Lat) a Leaflet (Lat, Lng)
                            if (geometry) {
                                return geometry.map((point: any[]) => [point[1], point[0]]);
                            }
                            return null;
                        })
                        .catch(console.error);
                }
                return Promise.resolve(null);
            });

            Promise.all(routePromises).then(results => {
                // Filtramos los resultados nulos
                setRouteGeometry(results.filter(r => r) as [number, number][][]);
            });

        } else {
            setRouteGeometry([]);
        }
    }, [units, incidents, selectedIncidentId]);

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
            .then((res) => { 
                if (!res.ok) throw new Error("Error al crear incidente. Verifique el backend."); 
                return res.json(); 
            })
            .then(() => {
                alert("Incidente creado");
                setNewIncidentTitle(''); setNewIncidentAddress(''); loadIncidents();
            })
            .catch((err) => alert(err.message));
    };

    const handleSelectIncident = (id: string) => {
        if (selectedIncidentId === id) {
            setSelectedIncidentId(null);
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

                    {/* Mostrar Unidades */}
                    {Array.isArray(units) && units.map((unit) => (
                        <Marker key={unit.id} position={[unit.lat, unit.lng]} icon={getUnitIcon(unit.type, unit.status)}>
                            <Popup>
                                <strong>{UNIT_NAMES[unit.type]}</strong><br />
                                ID: {unit.name}<br />
                                Estado: <strong>{unit.status}</strong>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Mostrar Incidentes */}
                    {Array.isArray(incidents) && incidents.map((inc) => (
                        <Marker key={inc.id} position={[inc.location.coordinates[1], inc.location.coordinates[0]]} icon={IncidentIcon}>
                            <Popup>
                                <strong style={{ color: '#FF4D4D' }}>🔥 {inc.title}</strong><br />
                                Prioridad: {inc.priority}<br />
                                {inc.status}
                            </Popup>
                        </Marker>
                    ))}

                    {/* DIBUJAR MÚLTIPLES RUTAS */}
                    {Array.isArray(routeGeometry) && routeGeometry.map((route: [number, number][], index: number) => (
                        <Polyline 
                            key={index} 
                            positions={route} 
                            pathOptions={{ color: "#00FFFF", dashArray: "8, 8", weight: 4 }} 
                        />
                    ))}
                </MapContainer>

                <IncidentList
                    incidents={incidents}
                    units={units} // Pasamos las unidades para calcular disponibilidad
                    loadIncidents={loadIncidents}
                    onSelect={handleSelectIncident}
                    selectedId={selectedIncidentId}
                />
            </div>
        </div>
    );
};

export default MapComponent;