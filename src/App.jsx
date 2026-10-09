import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Inicio from './views/Inicio';
import Productos from './views/Productos';
import Inventario from './views/Inventario';
import Clientes from './views/Clientes';
import Inversiones from './views/Inversiones';
import Creditos from './views/Creditos';
import Gastos from './views/Gastos';
import Abonos from './views/Abonos';
import Ventas from './views/Ventas';
import Login from './views/Login';
import Proveedores from './views/Proveedores';
import Arqueos from './views/Arqueos';
import ReportesMensuales from './views/ReportesMensuales';
import RutaProtegida from './components/RutaProtegida';
import Chatbot from './components/Chatbot/Chatbot'; // ✅ NUEVO IMPORT
import { iniciarEscuchaOffline, sincronizarOperaciones } from './services/OfflineService';
import './App.css';

function App() {
  useEffect(() => {
    const cleanup = iniciarEscuchaOffline();

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
        {/* ===== RUTA PÚBLICA ===== */}
        <Route path="/login" element={<Login />} />

        {/* ===== RUTAS PARA TODOS (admin y usuario) ===== */}
        <Route path="/" element={<RutaProtegida><Inicio /></RutaProtegida>} />
        <Route path="/productos" element={<RutaProtegida><Productos /></RutaProtegida>} />
        <Route path="/clientes" element={<RutaProtegida><Clientes /></RutaProtegida>} />
        <Route path="/creditos" element={<RutaProtegida><Creditos /></RutaProtegida>} />
        <Route path="/abonos" element={<RutaProtegida><Abonos /></RutaProtegida>} />
        <Route path="/ventas" element={<RutaProtegida><Ventas /></RutaProtegida>} />
        <Route path="/proveedores" element={<RutaProtegida><Proveedores /></RutaProtegida>} />
        <Route path="/arqueos" element={<RutaProtegida><Arqueos /></RutaProtegida>} />
        <Route path="/reportesmensuales" element={<RutaProtegida><ReportesMensuales /></RutaProtegida>} />

        {/* ===== RUTAS SOLO ADMIN ===== */}
        <Route
          path="/inventario"
          element={
            <RutaProtegida rolesPermitidos={['admin']}>
              <Inventario />
            </RutaProtegida>
          }
        />
        <Route
          path="/inversiones"
          element={
            <RutaProtegida rolesPermitidos={['admin']}>
              <Inversiones />
            </RutaProtegida>
          }
        />
        <Route
          path="/gastos"
          element={
            <RutaProtegida rolesPermitidos={['admin']}>
              <Gastos />
            </RutaProtegida>
          }
        />

        {/* ===== CUALQUIER OTRA RUTA → INICIO ===== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* ✅ CHATBOT FLOTANTE - Disponible en toda la app */}
      <Chatbot />
    </BrowserRouter>
  );
}

export default App;