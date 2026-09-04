// src/components/creditos/ModalAgregarCredito.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../database/supabase';
import './ModalAgregarCredito.css';

const ModalAgregarCredito = ({ 
  isOpen, 
  onClose, 
  onCreditoAgregado, 
  clientes 
}) => {
  // 📌 DEBUG: Ver qué llega
  console.log('🔍 MODAL - clientes recibido:', clientes);
  console.log('🔍 MODAL - tipo:', typeof clientes);
  console.log('🔍 MODAL - es array?', Array.isArray(clientes));
  
  const clientesList = Array.isArray(clientes) ? clientes : [];
  console.log('✅ MODAL - clientesList final:', clientesList);
  console.log('✅ MODAL - cantidad:', clientesList.length);

  const [formData, setFormData] = useState({
    cliente_id: '',
    monto_total: '',
    fecha_inicio: new Date().toISOString().slice(0, 16),
    fecha_fin: '',
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        cliente_id: '',
        monto_total: '',
        fecha_inicio: new Date().toISOString().slice(0, 16),
        fecha_fin: '',
        observaciones: ''
      });
      setError(null);
    }
  }, [isOpen]);

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

      const nuevoCredito = {
        cliente_id: parseInt(formData.cliente_id),
        fecha_inicio: new Date(formData.fecha_inicio).toISOString(),
        fecha_fin: formData.fecha_fin,
        monto_total: montoTotal,
        monto_pagado: 0,
        saldo_pendiente: montoTotal,
        estado: 'activo',
        observaciones: formData.observaciones || null
      };

      const { data, error } = await supabase
        .from('creditos')
        .insert([nuevoCredito])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        onCreditoAgregado();
      } else {
        setError('Error al crear el crédito');
      }

    } catch (err) {
      console.error('Error creando crédito:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">Nuevo Crédito</h2>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="form-error">
                <span>❌ {error}</span>
              </div>
            )}

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
                <small className="form-help warning">
                  ⚠️ No hay clientes registrados. Crea un cliente primero.
                </small>
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
              {loading ? 'Guardando...' : 'Guardar Crédito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalAgregarCredito;