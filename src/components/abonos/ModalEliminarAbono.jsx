import React from 'react';
import './ModalEliminarAbono.css';

const ModalEliminarAbono = ({ isOpen, onClose, onConfirm, abono, loading }) => {
  if (!isOpen || !abono) return null;

  const handleConfirm = () => {
    onConfirm(abono.id);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content confirm">
        <h2>Eliminar Abono</h2>
        <p>¿Estás seguro de eliminar este abono?</p>
        <p><strong>Cliente:</strong> {abono.credito?.cliente?.nombre || 'N/A'}</p>
        <p><strong>Monto:</strong> ${abono.monto?.toFixed(2)}</p>
        <p><strong>Fecha:</strong> {new Date(abono.fecha).toLocaleString()}</p>
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="button" onClick={handleConfirm} disabled={loading} className="btn-danger">
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminarAbono;
