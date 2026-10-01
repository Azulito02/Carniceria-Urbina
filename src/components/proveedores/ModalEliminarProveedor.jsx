import React, { useState } from 'react';
import './ModalProveedor.css';

const ModalEliminarProveedor = ({
  isOpen,
  onClose,
  onConfirm,
  proveedor,
  getEtiquetaCategoria,
  loading
}) => {
  const [error, setError] = useState('');

  const handleEliminar = async () => {
    setError('');
    const success = await onConfirm(proveedor.id);
    if (success) onClose();
  };

  if (!isOpen || !proveedor) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-proveedor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-danger">
          <h2 className="modal-titulo">
            <i className="fas fa-trash-alt"></i> Eliminar Proveedor
          </h2>
          <button className="modal-cerrar" onClick={onClose}>
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
              ¿Estás seguro de eliminar al proveedor{' '}
              <strong>"{proveedor.nombre_empresa}"</strong>?
            </p>

            <div className="detalle-proveedor">
              {proveedor.nombre_vendedor && (
                <span>
                  <i className="fas fa-user"></i> <strong>{proveedor.nombre_vendedor}</strong>
                </span>
              )}
              {proveedor.categorias && proveedor.categorias.length > 0 && (
                <div className="categorias-eliminar">
                  {proveedor.categorias.map(cat => (
                    <span key={cat} className="cat-badge-small">
                      {getEtiquetaCategoria ? getEtiquetaCategoria(cat) : cat}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="mensaje-advertencia">
              <i className="fas fa-info-circle"></i>
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-modal-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-modal-eliminar"
            onClick={handleEliminar}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Eliminando...
              </>
            ) : (
              <>
                <i className="fas fa-trash-alt"></i> Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminarProveedor;