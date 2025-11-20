import MapComponent from './MapComponent';

function App() {
  return (
    <div className="app-container">
      <h1>UrbanPulse: Monitor en Tiempo Real</h1>
      <div style={{ border: '2px solid #333', marginTop: '20px' }}>
        <MapComponent />
      </div>
    </div>
  );
}

export default App;