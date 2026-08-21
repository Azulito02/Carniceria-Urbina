import React from 'react';
import { useNavigate } from 'react-router-dom';

function Inicio() {
  const navigate = useNavigate();

  const modules = [
    { name: 'Productos', icon: 'fa-box', color: 'icon-productos', path: '/productos' },
    { name: 'Inventario', icon: 'fa-warehouse', color: 'icon-inventario', path: '/inventario' },
    { name: 'Ventas', icon: 'fa-cash-register', color: 'icon-ventas', path: '/ventas' },
    { name: 'Créditos', icon: 'fa-credit-card', color: 'icon-creditos', path: '/creditos' },
    { name: 'Abonos', icon: 'fa-hand-holding-usd', color: 'icon-abonos', path: '/abonos' },
    { name: 'Gastos', icon: 'fa-receipt', color: 'icon-gastos', path: '/gastos' },
    { name: 'Arqueos', icon: 'fa-calculator', color: 'icon-arqueos', path: '/arqueos' },
    { name: 'Reportes', icon: 'fa-chart-pie', color: 'icon-reportes', path: '/reportes' },
    { name: 'Servicios', icon: 'fa-concierge-bell', color: 'icon-servicios', path: '/servicios' },
    { name: 'Inversiones', icon: 'fa-chart-line', color: 'icon-inversiones', path: '/inversiones' },
  ];

  const irA = (path) => {
    console.log('Navegando a:', path);
    navigate(path);
  };

  return (
    <>
      <div className="header">
        <div className="header-left">
          <div className="header-logo">🥩</div>
          <div className="header-text">
            <span className="brand-icon">CARNICERÍA</span>
            <span className="brand-text">URBINA <span>· Admin</span></span>
          </div>
        </div>
        <div className="admin-badge">
          <i className="fas fa-user-circle"></i> Administrador
        </div>
      </div>

      <div className="welcome">
        <span className="logo-emoji">🥩</span>
        <h1>¡Bienvenido!</h1>
        <p>Carnicería Urbina · Sistema de gestión de inventario y ventas</p>
      </div>

      <div className="modules-grid">
        {modules.map((mod, i) => (
          <div className="module-card" key={i} onClick={() => irA(mod.path)}>
            <div className={`icon ${mod.color}`}>
              <i className={`fas ${mod.icon}`}></i>
            </div>
            <div className="info">
              <span className="label">{mod.name}</span>
              <span className="action">Gestionar</span>
            </div>
            <i className="fas fa-chevron-right arrow"></i>
          </div>
        ))}
      </div>

      <div className="summary">
        <div className="summary-header">
          <h3>Resumen general</h3>
          <span><i className="far fa-calendar-alt"></i> Hoy</span>
        </div>
        <div className="summary-cards">
          <div className="summary-item">
            <div className="icon-circle resumen-ventas"><i className="fas fa-dollar-sign"></i></div>
            <span className="number valor-rojo">C$ 3,771</span>
            <span className="desc">Ventas del día</span>
          </div>
          <div className="summary-item">
            <div className="icon-circle resumen-realizadas"><i className="fas fa-check"></i></div>
            <span className="number valor-verde">24</span>
            <span className="desc">Ventas realizadas</span>
          </div>
          <div className="summary-item">
            <div className="icon-circle resumen-pendientes"><i className="fas fa-clock"></i></div>
            <span className="number valor-naranja">5</span>
            <span className="desc">Pendientes</span>
          </div>
        </div>
      </div>

      <div className="bottom-nav">
        <button className="nav-item active" onClick={() => irA('/')}>
          <i className="fas fa-home"></i><span>Inicio</span>
        </button>
        <button className="nav-item" onClick={() => irA('/productos')}>
          <i className="fas fa-box"></i><span>Productos</span>
        </button>
        <button className="nav-item" onClick={() => irA('/ventas')}>
          <i className="fas fa-cash-register"></i><span>Ventas</span>
        </button>
        <button className="nav-item">
          <i className="fas fa-ellipsis-h"></i><span>Más</span>
        </button>
      </div>
    </>
  );
}

export default Inicio;