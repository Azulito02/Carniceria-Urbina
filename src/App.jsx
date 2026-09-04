import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Inicio from './views/Inicio';
import Productos from './views/Productos';
import Inventario from './views/Inventario';
import Clientes from './views/Clientes';
import Inversiones from './views/Inversiones';
import Creditos from './views/Creditos';
import { iniciarEscuchaOffline, sincronizarOperaciones } from './services/OfflineService';
import './App.css';

function App() {
  useEffect(() => {
    // Iniciar escucha para sincronización automática cuando vuelva internet
    const cleanup = iniciarEscuchaOffline();
    
    // Sincronizar operaciones pendientes al inicio si hay internet
    if (navigator.onLine) {
      setTimeout(() => {
        sincronizarOperaciones().then(() => {
          console.log('✅ Sincronización inicial completada');
        });
      }, 3000);
    }
    
    return cleanup;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/inversiones" element={<Inversiones />} />
        <Route path="/creditos" element={<Creditos />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;