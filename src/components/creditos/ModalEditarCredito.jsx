// src/components/creditos/ModalEditarCredito.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../database/supabase';
import './ModalEditarCredito.css';

const ModalEditarCredito = ({ 
  isOpen, 
  onClose, 
  onCreditoEditado, 
  credito,
  clientes = [] 
}) => {
  const [formData, setFormData] = useState({
    cliente_id: '',
    monto_total: '',
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Asegurar que clientes sea un array
  const clientesList = Array.isArray(clientes) ? clientes : [];

  useEffect(() => {
    if (isOpen && credito) {
      setFormData({
        cliente_id: credito.cliente_id || '',
        monto_total: credito.monto_total || '',
        fecha_inicio: credito.fecha_inicio ? new Date(credito.fecha_inicio).toISOString().slice(0, 16) : '',
        fecha_fin: credito.fecha_fin || '',
        observaciones: credito.observaciones || ''
      });
      setError(null);
    }
  }, [isOpen, credito]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.cliente_id) {
        setError('Debes seleccionar un cliente');
        setLoading(false);
        return;
      }

      const montoTotal = parseFloat(formData.monto_total) || 0;
      if (montoTotal <= 0) {
        setError('El monto total debe ser mayor a 0');
        setLoading(false);
        return;
      }

      if (!formData.fecha_fin) {
        setError('La fecha de vencimiento es obligatoria');
        setLoading(false);
        return;
      }

      const datosActualizar = {
        cliente_id: parseInt(formData.cliente_id),
        fecha_inicio: new Date(formData.fecha_inicio).toISOString(),
        fecha_fin: formData.fecha_fin,
        monto_total: montoTotal,
        observaciones: formData.observaciones || null
      };

      const { data, error } = await supabase
        .from('creditos')
        .update(datosActualizar)
        .eq('id', credito.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        onCreditoEditado();
      } else {
        setError('Error al actualizar el crédito');
      }

    } catch (err) {
      console.error('Error actualizando crédito:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !credito) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">Editar Crédito #{credito.id}</h2>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="form-error">
                <span>❌ {error}</span>
              </div>
            )}

            {/* ✅ SELECT DE CLIENTES */}
            <div className="form-grupo">
              <label className="form-label">
                Cliente <span className="required">*</span>
              </label>
              <select
                value={formData.cliente_id}
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                className="form-select"
                required
              >
                <option value="">Seleccionar cliente...</option>
                {clientesList.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
              {clientesList.length === 0 && (
                <small className="form-help">⚠️ No hay clientes registrados.</small>
              )}
            </div>

            <div className="form-grupo">
              <label className="form-label">
                Monto Total (C$) <span className="required">*</span>
              </label>
              <input
                type="number"
                value={formData.monto_total}
                onChange={(e) => setFormData({ ...formData, monto_total: e.target.value })}
                className="form-input"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-grupo">
                <label className="form-label">Fecha Inicio</label>
                <input
                  type="datetime-local"
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-grupo">
                <label className="form-label">
                  Fecha Vencimiento <span className="required">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-grupo">
              <label className="form-label">Saldo Pendiente</label>
              <input
                type="text"
                value={`C$${parseFloat(credito.saldo_pendiente || 0).toFixed(2)}`}
                className="form-input"
                disabled
              />
              <small className="form-help">El saldo pendiente se actualiza con los abonos registrados</small>
            </div>

            <div className="form-grupo">
              <label className="form-label">Observaciones</label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="form-textarea"
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal-guardar" disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar Crédito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarCredito;