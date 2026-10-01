import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useStockBajo from '../hooks/useStockBajo';
import './Encabezado.css';
import logo from '../assets/logo2.png';

function Encabezado() {
  const navigate = useNavigate();
  const { perfil, user, logout, esAdmin } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [panelStock, setPanelStock] = useState(false);
  const { productosBajos } = useStockBajo();

  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
    setPanelStock(false);
  };

  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  const togglePanelStock = () => {
    setPanelStock(!panelStock);
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
          {/* ===== CAMPANITA DE STOCK BAJO ===== */}
          <div className="stock-alerta-container">
            <button
              className={`stock-alerta-btn ${productosBajos.length > 0 ? 'con-alertas' : ''}`}
              onClick={togglePanelStock}
              title="Productos con poco stock"
            >
              <i className="fas fa-bell"></i>
              {productosBajos.length > 0 && (
                <span className="stock-alerta-badge">{productosBajos.length}</span>
              )}
            </button>

            {panelStock && (
              <div className="stock-alerta-panel">
                <div className="stock-alerta-panel-header">
                  <strong>
                    <i className="fas fa-exclamation-triangle"></i> Poco stock
                  </strong>
                  <button className="stock-alerta-cerrar" onClick={() => setPanelStock(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                {productosBajos.length === 0 ? (
                  <p className="stock-alerta-vacio">
                    <i className="fas fa-check-circle"></i> Todo el stock está en orden
                  </p>
                ) : (
                  <ul className="stock-alerta-lista">
                    {productosBajos.map((p) => (
                      <li key={p.id} className="stock-alerta-item">
                        <span className="stock-alerta-nombre">{p.nombre}</span>
                        <span className="stock-alerta-cantidad">
                          {p.cantidad.toFixed(2)} {p.unidad_medida}
                          <small> (mín. {p.stock_minimo ?? 5})</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {esAdmin && (
                  <button
                    className="stock-alerta-ver"
                    onClick={() => {
                      setPanelStock(false);
                      navigate('/inventario');
                    }}
                  >
                    Ir al inventario
                  </button>
                )}
              </div>
            )}
          </div>

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
                  <button className="dropdown-item" onClick={() => irA('/proveedores')}>
                    <i className="fas fa-truck"></i>
                    <span>Proveedores</span>
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
