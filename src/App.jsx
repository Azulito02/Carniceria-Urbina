
import React, { useEffect } from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

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
import Chatbot from './components/Chatbot/Chatbot';

import { useAuth } from './context/AuthContext';

import {
  iniciarEscuchaOffline,
  sincronizarOperaciones
} from './services/OfflineService';

import './App.css';
import './styles/responsive-modulos.css';
import './styles/modales-unificados.css';

/* ===== CHATBOT SOLO CON SESIÓN ===== */

function ChatbotProtegido() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (
    loading ||
    !user ||
    location.pathname === '/login'
  ) {
    return null;
  }

  return <Chatbot />;
}

/* ===== RUTAS DEL SISTEMA ===== */

function ContenidoApp() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <RutaProtegida>
              <Inicio />
            </RutaProtegida>
          }
        />

        <Route
          path="/productos"
          element={
            <RutaProtegida>
              <Productos />
            </RutaProtegida>
          }
        />

        <Route
          path="/clientes"
          element={
            <RutaProtegida>
              <Clientes />
            </RutaProtegida>
          }
        />

        <Route
          path="/creditos"
          element={
            <RutaProtegida>
              <Creditos />
            </RutaProtegida>
          }
        />

        <Route
          path="/abonos"
          element={
            <RutaProtegida>
              <Abonos />
            </RutaProtegida>
          }
        />

        <Route
          path="/ventas"
          element={
            <RutaProtegida>
              <Ventas />
            </RutaProtegida>
          }
        />

        <Route
          path="/proveedores"
          element={
            <RutaProtegida>
              <Proveedores />
            </RutaProtegida>
          }
        />

        <Route
          path="/arqueos"
          element={
            <RutaProtegida>
              <Arqueos />
            </RutaProtegida>
          }
        />

        {/* ===== SOLO ADMINISTRADOR ===== */}

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

        <Route
          path="/reportesmensuales"
          element={
            <RutaProtegida rolesPermitidos={['admin']}>
              <ReportesMensuales />
            </RutaProtegida>
          }
        />

        {/* ===== RUTA NO ENCONTRADA ===== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>

      {/* CHATBOT SOLO DESPUÉS DEL LOGIN */}
      <ChatbotProtegido />
    </>
  );
}

/* ===== APLICACIÓN PRINCIPAL ===== */

function App() {
  useEffect(() => {
    const cleanup = iniciarEscuchaOffline();

    let temporizador;

    if (navigator.onLine) {
      temporizador = setTimeout(() => {
        sincronizarOperaciones()
          .then(() => {
            console.log(
              '✅ Sincronización inicial completada'
            );
          })
          .catch((error) => {
            console.error(
              'Error de sincronización:',
              error
            );
          });
      }, 3000);
    }

    return () => {
      clearTimeout(temporizador);

      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  return (
    <BrowserRouter>
      <ContenidoApp />
    </BrowserRouter>
  );
}

export default App;
