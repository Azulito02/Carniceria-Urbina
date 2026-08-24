import React from 'react';
import './ModalEliminarCliente.css';

function ModalEliminarCliente({ isOpen, onClose, onConfirm, cliente, loading }) {
  if (!isOpen) return null;

  const handleEliminar = () => {
    if (!cliente || !cliente.id) {
      alert('Error: No hay cliente para eliminar');
      return;
    }
    onConfirm(cliente.id);
  };

  return (
    <div className="modal-eliminar-overlay" onClick={onClose}>
      <div className="modal-eliminar-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-eliminar-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h2>🗑️ Eliminar Cliente</h2>
        <p>
          ¿Estás seguro de eliminar <strong>"{cliente?.nombre}"</strong>?
          <br />
          <span className="modal-eliminar-aviso">Esta acción no se puede deshacer.</span>
        </p>

        <div className="modal-eliminar-buttons">
          <button className="btn-eliminar-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-eliminar-confirmar" onClick={handleEliminar} disabled={loading}>
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalEliminarCliente;