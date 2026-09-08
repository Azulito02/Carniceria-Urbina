import React from 'react';
import './TablaAbonos.css';

const TablaAbonos = ({ abonos, loading, onEditar, onEliminar }) => {
  if (loading) {
    return <div className="loading">Cargando abonos...</div>;
  }

  if (abonos.length === 0) {
    return <div className="empty">No hay abonos registrados.</div>;
  }

  return (
    <div className="tabla-container">
      <table className="tabla-abonos">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Monto</th>
            <th>Método</th>
            <th>Banco</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {abonos.map((abono) => (
            <tr key={abono.id}>
              <td>{abono.id}</td>
              <td>{abono.credito?.cliente?.nombre || 'N/A'}</td>
              <td>${abono.monto?.toFixed(2)}</td>
              <td>{abono.metodo_pago}</td>
              <td>{abono.banco || '-'}</td>
              <td>{new Date(abono.fecha).toLocaleString()}</td>
              <td>
                <button className="btn-editar" onClick={() => onEditar(abono)}>
                  <i className="fas fa-edit"></i>
                </button>
                <button className="btn-eliminar" onClick={() => onEliminar(abono)}>
                  <i className="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaAbonos;
