import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RutaProtegida({ children, rolesPermitidos }) {
  const { user, perfil, loading } = useAuth();
  const location = useLocation();

  // Mientras verifica la sesión, mostrar pantalla de carga
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        background: 'linear-gradient(135deg, #8B1E1E 0%, #5a1010 100%)',
        color: 'white',
        fontSize: '16px'
      }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px' }}></i>
        <span>Cargando...</span>
      </div>
    );
  }

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se definieron rolesPermitidos, validar el rol del perfil
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    const rolUsuario = perfil?.rol || 'usuario';

    if (!rolesPermitidos.includes(rolUsuario)) {
      // Usuario sin permiso → redirigir al inicio
      return <Navigate to="/" replace />;
    }
  }

  // Si hay usuario y tiene permiso, renderizar el contenido
  return children;
}

export default RutaProtegida;