import React from 'react';
import './TablaGastos.css';

const TablaGastos = ({ gastos, loading, onEditar, onEliminar }) => {
  if (loading) {
    return (
      <div className="tabla-loading">
        <div className="spinner"></div>
        <p>Cargando gastos...</p>
      </div>
    );
  }

  if (!gastos || gastos.length === 0) {
    return (
      <div className="tabla-vacia">
        <i className="fas fa-inbox"></i>
        <p>No hay gastos registrados</p>
        <span>Haz clic en "Agregar" para crear un nuevo gasto</span>
      </div>
    );
  }

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    try {
      const date = new Date(fecha);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return fecha;
    }
  };

  // Formatear monto como moneda
  const formatearMonto = (monto) => {
    return new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'NIO',
      minimumFractionDigits: 2
    }).format(monto);
  };

  return (
    <div className="tabla-container">
      <div className="tabla-scroll">
        <table className="tabla-gastos">
          <thead>
            <tr>
              <th>#</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Fecha de Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((gasto, index) => (
              <tr key={gasto.id || index} className={gasto._local ? 'fila-local' : ''}>
                <td className="numero">{index + 1}</td>
                <td className="descripcion">{gasto.descripcion}</td>
                <td className={`monto ${gasto.monto < 0 ? 'monto-negativo' : 'monto-positivo'}`}>
                  {formatearMonto(gasto.monto)}
                </td>
                <td className="fecha">{formatearFecha(gasto.fecha_registro)}</td>
                <td className="acciones">
                  <div className="acciones-botones">
                    <button
                      className="btn-editar"
                      onClick={() => onEditar(gasto)}
                      title="Editar gasto"
                    >
                      <i className="fas fa-edit"></i>
                      <span>Editar</span>
                    </button>
                    <button
                      className="btn-eliminar"
                      onClick={() => onEliminar(gasto)}
                      title="Eliminar gasto"
                    >
                      <i className="fas fa-trash-alt"></i>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TablaGastos;