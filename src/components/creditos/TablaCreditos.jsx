// src/components/creditos/TablaCreditos.jsx
import React from 'react';
import './TablaCreditos.css';

const TablaCreditos = ({ 
  creditos, 
  loading, 
  onEditar, 
  onEliminar,
  getEstadoCredito 
}) => {
  
  const formatFecha = (fechaISO) => {
    if (!fechaISO) return 'Fecha no disponible';
    try {
      const fechaUTC = new Date(fechaISO);
      const fechaNic = new Date(fechaUTC.getTime() - (6 * 60 * 60 * 1000));
      const d = fechaNic.getDate().toString().padStart(2, '0');
      const m = (fechaNic.getMonth() + 1).toString().padStart(2, '0');
      const y = fechaNic.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return fechaISO;
    }
  };

  if (loading) {
    return (
      <div className="tabla-creditos-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando créditos...</p>
        </div>
      </div>
    );
  }

  if (creditos.length === 0) {
    return (
      <div className="tabla-creditos-container">
        <div className="sin-datos">
          <p>No hay créditos registrados</p>
          <p className="sin-datos-sub">Haz clic en "Nuevo Crédito" para agregar uno</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tabla-creditos-container">
      <div className="tabla-scroll">
        <table className="tabla-creditos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Fecha Inicio</th>
              <th>Vencimiento</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {creditos.map((credito) => {
              const estado = getEstadoCredito(credito);
              const saldo = credito.saldo_pendiente || 0;
              const total = credito.monto_total || 0;
              const pagado = credito.monto_pagado || 0;
              
              return (
                <tr key={credito.id} className={saldo === 0 ? 'fila-completada' : ''}>
                  <td className="col-id">#{credito.id}</td>
                  <td className="col-cliente">
                    <strong>{credito.cliente_nombre || 'Cliente no disponible'}</strong>
                  </td>
                  <td className="col-fecha">{formatFecha(credito.fecha_inicio)}</td>
                  <td className="col-fecha">{formatFecha(credito.fecha_fin)}</td>
                  <td className="col-monto total">
                    C${total.toFixed(2)}
                  </td>
                  <td className="col-monto pagado">
                    C${pagado.toFixed(2)}
                  </td>
                  <td className="col-monto saldo">
                    <strong>C${saldo.toFixed(2)}</strong>
                  </td>
                  <td className="col-estado">
                    <span className={`badge-estado ${estado.clase}`}>
                      {estado.texto}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <button
                      onClick={() => onEditar(credito)}
                      className="btn-accion editar"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onEliminar(credito)}
                      className="btn-accion eliminar"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TablaCreditos;