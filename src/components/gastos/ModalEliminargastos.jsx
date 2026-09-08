import React from 'react';
import './ModalEliminarGastos.css';

const ModalEliminarGasto = ({ isOpen, onClose, onConfirm, gasto, loading }) => {
  if (!isOpen || !gasto) return null;

  const handleConfirm = () => {
    onConfirm(gasto.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Eliminar Gasto</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <p className="mensaje-eliminar">
            ¿Estás seguro de eliminar el gasto <strong>"{gasto.descripcion}"</strong>?
          </p>
          <p className="monto-eliminar">
            Monto: {new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(gasto.monto)}
          </p>
          <p className="advertencia">Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-cancelar" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="btn-eliminar-confirm" onClick={handleConfirm} disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminarGasto;