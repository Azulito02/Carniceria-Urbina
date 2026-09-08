import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Encabezado.css';
import logo from '../assets/logo2.png';

function Encabezado() {
  const navigate = useNavigate();
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

  return (
    <div className="encabezado">
      <div className="encabezado-inner">
        <div className="encabezado-left">
          <img src={logo} alt="CARNICERÍA URBINA" className="encabezado-logo-img" />
          <div className="encabezado-text">
            <span className="encabezado-brand-icon">CARNICERÍA</span>
            <span className="encabezado-brand-text">URBINA <span>- Admin</span></span>
          </div>
        </div>
        <div className="encabezado-admin">
          <i className="fas fa-user-circle"></i> Administrador
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
        <button className="nav-superior-item" onClick={() => navigate('/inventario')}>
          <i className="fas fa-warehouse"></i>
          <span>Inventario</span>
        </button>
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
              <button className="dropdown-item" onClick={() => irA('/clientes')}>
                <i className="fas fa-users"></i>
                <span>Clientes</span>
              </button>
              <button className="dropdown-item" onClick={() => irA('/creditos')}>
                <i className="fas fa-credit-card"></i>
                <span>Créditos</span>
              </button>
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
              <button className="dropdown-item" onClick={() => irA('/abonos')}>
                <i className="fas fa-hand-holding-usd"></i>
                <span>Abonos</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Encabezado;