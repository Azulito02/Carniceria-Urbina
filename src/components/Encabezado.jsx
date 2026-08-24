import React from 'react';
import './Encabezado.css';
import logo from '../assets/logo2.png';

function Encabezado() {
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
    </div>
  );
}

export default Encabezado;