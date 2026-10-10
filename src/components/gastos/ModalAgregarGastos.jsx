import React, { useState, useEffect } from 'react';
import './ModalAgregarGastos.css';

const ModalAgregarGastos = ({ isOpen, onClose, onSave, loading }) => {
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDescripcion('');
      setMonto('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!descripcion.trim()) {
      setError('La descripción es obligatoria');
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum === 0) {
      setError('Ingrese un monto válido (no cero)');
      return;
    }

    onSave({ descripcion: descripcion.trim(), monto: montoNum });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Agregar Gasto</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}
            <div className="campo">
              <label htmlFor="descripcion">Descripción</label>
              <input
                type="text"
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Compra de pintura"
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="campo">
              <label htmlFor="monto">Monto (C$)</label>
              <input
                type="number"
                id="monto"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 230.00 o -230.00"
                step="0.01"
                disabled={loading}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancelar" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalAgregarGastos;