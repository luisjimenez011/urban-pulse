import { useEffect, useState } from 'react';

// Definimos el tipo de dato que esperamos (TypeScript <3)
interface ServerResponse {
  status: string;
  system: string;
  timestamp: string;
}

function App() {
  const [data, setData] = useState<ServerResponse | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // INTENTAMOS CONECTAR AL BACKEND (Puerto 3000)
    fetch('http://localhost:3000/api/v1')
      .then((res) => res.json())
      .then((val) => setData(val))
      .catch(() => setError('Error: No se pudo conectar con el servidor (¿Está encendido?)'));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>UrbanPulse: Panel de Control</h1>
      <hr />
      <h3>Estado del Sistema:</h3>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {data ? (
        <div style={{ background: 'rgba(0, 0, 0, 1)', padding: '1rem', borderRadius: '8px' }}>
          <p><strong>Status:</strong> {data.status}</p>
          <p><strong>System:</strong> {data.system}</p>
          <p><strong>Time:</strong> {data.timestamp}</p>
        </div>
      ) : (
        !error && <p>Cargando conexión...</p>
      )}
    </div>
  );
}

export default App;