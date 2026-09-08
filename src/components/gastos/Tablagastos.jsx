import React from 'react';
import './TablaGastos.css';

const TablaGastos = ({ gastos, loading, onEditar, onEliminar }) => {
  if (loading) {
    return <div className="tabla-loading">Cargando gastos...</div>;
  }

  if (!gastos || gastos.length === 0) {
    return (
      <div className="tabla-vacia">
        <i className="fas fa-inbox"></i>
        <p>No hay gastos registrados</p>
      </div>
    );
  }

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    const date = new Date(fecha);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
      <table className="tabla-gastos">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Fecha de Registro</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {gastos.map((gasto) => (
            <tr key={gasto.id}>
              <td>{gasto.descripcion}</td>
              <td className={gasto.monto < 0 ? 'monto-negativo' : 'monto-positivo'}>
                {formatearMonto(gasto.monto)}
              </td>
              <td>{formatearFecha(gasto.fecha_registro)}</td>
              <td>
                <div className="acciones-botones">
                  <button
                    className="btn-editar"
                    onClick={() => onEditar(gasto)}
                    title="Editar"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-eliminar"
                    onClick={() => onEliminar(gasto)}
                    title="Eliminar"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaGastos;