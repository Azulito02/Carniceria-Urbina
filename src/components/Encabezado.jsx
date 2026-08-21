import React from 'react';
import './Encabezado.css';

function Encabezado() {
  return (
    <div className="encabezado">
      <div className="encabezado-left">
        <div className="encabezado-logo">🥩</div>
        <div className="encabezado-text">
          <span className="encabezado-brand-icon">CARNICERÍA</span>
          <span className="encabezado-brand-text">URBINA <span>· Admin</span></span>
        </div>
      </div>
      <div className="encabezado-admin">
        <i className="fas fa-user-circle"></i> Administrador
      </div>
    </div>
  );
}

export default Encabezado;