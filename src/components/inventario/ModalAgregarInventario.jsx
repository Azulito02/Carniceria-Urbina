import React, { useState, useEffect } from 'react';
import './ModalAgregarInventario.css';

function ModalAgregarInventario({ isOpen, onClose, onAgregar, productos, fecha, loading }) {
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fecha || new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProductoId('');
      setCantidad('');
      setFechaSeleccionada(fecha || new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen, fecha]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!productoId) {
      setError('Selecciona un producto');
      return;
    }

    if (!cantidad || parseFloat(cantidad) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    if (!fechaSeleccionada) {
      setError('Selecciona una fecha');
      return;
    }

    const success = await onAgregar(productoId, cantidad, fechaSeleccionada);
    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="fas fa-plus-circle"></i>
            Agregar Producto al Inventario
          </h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="modal-error">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>
                <i className="fas fa-box"></i>
                Producto *
              </label>
              <select
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
                className="form-select"
                required
              >
                <option value="">Seleccionar producto...</option>
                {productos && productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.marca ? `(${p.marca})` : ''} - {p.unidad_medida}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <i className="fas fa-weight-hanging"></i>
                Cantidad *
              </label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>
                <i className="fas fa-calendar-day"></i>
                Fecha *
              </label>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Agregando...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Agregar Producto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalAgregarInventario;