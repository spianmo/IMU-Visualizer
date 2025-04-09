import React from 'react';
import './App.css';
import IMUVisualizer from './components/IMUVisualizer';

function App() {
  return (
    <div className="App">
      <main style={{ width: '100vw', height: '100vh' }}>
        <IMUVisualizer websocketUrl="ws://localhost:8080" />
      </main>
    </div>
  );
}

export default App;
