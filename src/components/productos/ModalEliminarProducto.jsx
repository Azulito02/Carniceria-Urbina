import React from 'react';
import './ModalEliminarProducto.css';

function ModalEliminarProducto({ isOpen, onClose, onConfirm, producto, loading }) {
  if (!isOpen) return null;

  // ===== MANEJAR ELIMINACIÓN =====
  const handleEliminar = () => {
    if (!producto || !producto.id) {
      alert('Error: No hay producto para eliminar');
      return;
    }
    // Pasar el ID del producto a la función onConfirm
    onConfirm(producto.id);
  };

  return (
    <div className="modal-eliminar-overlay" onClick={onClose}>
      <div className="modal-eliminar-content" onClick={(e) => e.stopPropagation()}>
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
          <button 
            className="btn-eliminar-cancelar" 
            onClick={onClose}
            type="button"
          >
            <i className="fas fa-times"></i> Cancelar
          </button>
          <button 
            className="btn-eliminar-confirmar" 
            onClick={handleEliminar}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Eliminando...
              </>
            ) : (
              <>
                <i className="fas fa-trash"></i> Sí, eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalEliminarProducto;