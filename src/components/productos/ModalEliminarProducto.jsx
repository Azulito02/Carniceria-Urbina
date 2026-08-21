import React from 'react';


function ModalEliminarProducto({ isOpen, onClose, onConfirm, producto, loading }) {
  if (!isOpen) return null;

  return (
    <div className="modal-eliminar-overlay">
      <div className="modal-eliminar-content">
        <div className="modal-eliminar-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h2>🗑️ Eliminar Producto</h2>
        <p>
          ¿Estás seguro de eliminar <strong>"{producto?.nombre}"</strong>?
          <br />
          <span className="modal-eliminar-aviso">Esta acción no se puede deshacer.</span>
        </p>

        <div className="modal-eliminar-buttons">
          <button className="btn-eliminar-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-eliminar-confirmar" onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ ESTO ES LO QUE ESTABA FALTANDO
export default ModalEliminarProducto;