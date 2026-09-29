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
import RutaProtegida from './components/RutaProtegida';
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
    </BrowserRouter>
  );
}

export default App;