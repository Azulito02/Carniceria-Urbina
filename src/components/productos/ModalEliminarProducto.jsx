
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const ModalEliminarProducto = ({
  isOpen,
  onClose,
  onConfirm,
  producto,
  loading = false
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !loading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen || !producto) return null;

  const handleConfirm = () => {
    if (loading) return;

    if (producto.id === null || producto.id === undefined) {
      alert('No se pudo identificar el producto.');
      return;
    }

    onConfirm(producto.id);
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        overflowY: 'auto'
      }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-eliminar-producto"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: 'calc(100dvh - 32px)',
          margin: 'auto',
          padding: 0,
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '18px 20px',
            borderBottom: '1px solid #eadedb',
            backgroundColor: '#ffffff'
          }}
        >
          <h3
            id="titulo-eliminar-producto"
            style={{
              margin: 0,
              color: '#8b1e1e',
              fontSize: '20px',
              fontWeight: 750
            }}
          >
            Eliminar Producto
          </h3>

          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            disabled={loading}
            aria-label="Cerrar ventana"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              flexShrink: 0,
              border: '1px solid #eadedb',
              borderRadius: '9px',
              backgroundColor: '#faf4f3',
              color: '#8b1e1e',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            padding: '24px 20px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '65px',
              height: '65px',
              margin: '0 auto 18px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              fontSize: '28px'
            }}
          >
            <i className="fas fa-trash-alt"></i>
          </div>

          <p
            className="mensaje-eliminar"
            style={{
              margin: '0 0 12px',
              fontSize: '15px',
              lineHeight: 1.6,
              color: '#374151'
            }}
          >
            ¿Estás seguro de eliminar el producto{' '}
            <strong>"{producto.nombre}"</strong>?
          </p>

          <p
            className="advertencia"
            style={{
              margin: 0,
              padding: '12px',
              backgroundColor: '#fff4e5',
              borderRadius: '9px',
              color: '#92400e',
              fontSize: '13px'
            }}
          >
            <i className="fas fa-exclamation-triangle"></i>
            {' '}Esta acción no se puede deshacer.
          </p>
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            gap: '12px',
            padding: '17px 20px',
            borderTop: '1px solid #eadedb',
            backgroundColor: '#faf7f6'
          }}
        >
          <button
            type="button"
            className="btn-cancelar"
            onClick={handleClose}
            disabled={loading}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: '47px',
              padding: '11px',
              backgroundColor: '#e9ecef',
              color: '#374151',
              border: '1px solid #d9ceca',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-eliminar-confirm"
            onClick={handleConfirm}
            disabled={loading}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: '47px',
              padding: '11px',
              backgroundColor: '#8b1e1e',
              color: '#ffffff',
              border: '1px solid #8b1e1e',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {' '}Eliminando...
              </>
            ) : (
              <>
                <i className="fas fa-trash-alt"></i>
                {' '}Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalEliminarProducto;
 