import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Encabezado.css';
import logo from '../assets/logo2.png';

function Encabezado() {
  const navigate = useNavigate();
  const { perfil, user, logout, esAdmin } = useAuth();  // ← agregamos esAdmin
  const [menuAbierto, setMenuAbierto] = useState(false);

  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
  };

  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  const irA = (ruta) => {
    navigate(ruta);
    cerrarMenu();
  };

  const handleLogout = async () => {
    const confirmar = window.confirm('¿Cerrar sesión?');
    if (!confirmar) return;

    await logout();
    navigate('/login', { replace: true });
  };

  // Nombre a mostrar: prioridad perfil.nombre → user.email
  const nombreUsuario = perfil?.nombre || user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="encabezado">
      <div className="encabezado-inner">
        <div className="encabezado-left">
          <img src={logo} alt="CARNICERÍA URBINA" className="encabezado-logo-img" />
          <div className="encabezado-text">
            <span className="encabezado-brand-icon">CARNICERÍA</span>
            <span className="encabezado-brand-text">
              URBINA <span>- {esAdmin ? 'Admin' : 'Usuario'}</span>
            </span>
          </div>
        </div>

        <div className="encabezado-usuario">
          <div className="encabezado-user-info">
            <i className="fas fa-user-circle"></i>
            <span className="encabezado-user-nombre">{nombreUsuario}</span>
            {esAdmin && (
              <span style={{
                marginLeft: '6px',
                fontSize: '10px',
                background: '#ffd700',
                color: '#8B1E1E',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 'bold'
              }}>
                ADMIN
              </span>
            )}
          </div>
          <button
            className="encabezado-logout-btn"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* ===== NAVEGACIÓN SUPERIOR ===== */}
      <div className="encabezado-nav">
        <button className="nav-superior-item" onClick={() => navigate('/')}>
          <i className="fas fa-home"></i>
          <span>Inicio</span>
        </button>
        <button className="nav-superior-item" onClick={() => navigate('/productos')}>
          <i className="fas fa-box"></i>
          <span>Productos</span>
        </button>

        {/* Inventario: SOLO ADMIN */}
        {esAdmin && (
          <button className="nav-superior-item" onClick={() => navigate('/inventario')}>
            <i className="fas fa-warehouse"></i>
            <span>Inventario</span>
          </button>
        )}

        <button className="nav-superior-item" onClick={() => navigate('/ventas')}>
          <i className="fas fa-cash-register"></i>
          <span>Ventas</span>
        </button>

        {/* ===== BOTÓN MÁS CON DROPDOWN ===== */}
        <div className="dropdown-container">
          <button
            className="nav-superior-item dropdown-btn"
            onClick={toggleMenu}
          >
            <i className="fas fa-ellipsis-h"></i>
            <span>Más</span>
            <i className={`fas fa-chevron-${menuAbierto ? 'up' : 'down'}`}
               style={{ fontSize: '10px', marginLeft: '4px' }} />
          </button>

          {menuAbierto && (
            <div className="dropdown-menu">
              {/* ==== Para TODOS ==== */}
              <button className="dropdown-item" onClick={() => irA('/clientes')}>
                <i className="fas fa-users"></i>
                <span>Clientes</span>
              </button>
              <button className="dropdown-item" onClick={() => irA('/creditos')}>
                <i className="fas fa-credit-card"></i>
                <span>Créditos</span>
              </button>
              <button className="dropdown-item" onClick={() => irA('/abonos')}>
                <i className="fas fa-hand-holding-usd"></i>
                <span>Abonos</span>
              </button>

              {/* ==== SOLO ADMIN ==== */}
              {esAdmin && (
                <>
                  <button className="dropdown-item" onClick={() => irA('/gastos')}>
                    <i className="fas fa-money-bill-wave"></i>
                    <span>Gastos</span>
                  </button>
                  <button className="dropdown-item" onClick={() => irA('/inversiones')}>
                    <i className="fas fa-chart-line"></i>
                    <span>Inversiones</span>
                  </button>
                  <button className="dropdown-item" onClick={() => irA('/reportes')}>
                    <i className="fas fa-file-alt"></i>
                    <span>Reportes</span>
                  </button>
                  <button className="dropdown-item" onClick={() => irA('/arqueos')}>
                    <i className="fas fa-calculator"></i>
                    <span>Arqueos</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Encabezado;