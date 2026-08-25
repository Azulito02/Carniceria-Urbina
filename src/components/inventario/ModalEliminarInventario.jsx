import React, { useState, useEffect } from 'react';
import './ModalEliminarInventario.css';

function ModalEliminarInventario({ isOpen, onClose, onEliminar, item, loading }) {
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  const handleEliminar = async () => {
    if (!item) return;
    const success = await onEliminar(item.id, item.nombre);
    if (success) {
      onClose();
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="fas fa-trash-alt"></i>
            Eliminar del Inventario
          </h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="modal-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="confirmacion-mensaje">
            <div className="icono-alerta">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <p>
              ¿Estás seguro de eliminar <strong>"{item.nombre}"</strong> del inventario?
            </p>
            <p className="detalle-producto">
              <span>Cantidad: <strong>{item.cantidad}</strong></span>
              <span>Fecha: <strong>{item.fecha}</strong></span>
            </p>
            <p className="mensaje-advertencia">
              <i className="fas fa-info-circle"></i>
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn-eliminar-confirmar" 
            onClick={handleEliminar}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Eliminando...
              </>
            ) : (
              <>
                <i className="fas fa-trash-alt"></i>
                Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalEliminarInventario;