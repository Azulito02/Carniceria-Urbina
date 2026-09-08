import React, { useState, useEffect } from 'react';
import './ModalAgregarAbono.css';

const bancos = ['ficohsa', 'lafise', 'banpro', 'avanz', 'bac', 'bdf'];

const ModalAgregarAbono = ({ isOpen, onClose, onSave, creditos, loading }) => {
  const [formData, setFormData] = useState({
    credito_id: '',
    monto: '',
    metodo_pago: 'efectivo',
    banco: '',
    fecha: new Date().toISOString().slice(0, 16),
    observaciones: ''
  });
  const [saldoPendiente, setSaldoPendiente] = useState(0);
  const [errorLocal, setErrorLocal] = useState('');

  // Cuando se selecciona un crédito, mostrar su saldo
  useEffect(() => {
    if (formData.credito_id) {
      const credito = creditos.find(c => c.id === parseInt(formData.credito_id));
      if (credito) {
        setSaldoPendiente(credito.saldo_pendiente);
        // Validar que el monto no supere el saldo
        if (parseFloat(formData.monto) > credito.saldo_pendiente) {
          setErrorLocal('El monto no puede superar el saldo pendiente');
        } else {
          setErrorLocal('');
        }
      }
    } else {
      setSaldoPendiente(0);
    }
  }, [formData.credito_id, formData.monto, creditos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.credito_id) {
      setErrorLocal('Selecciona un crédito');
      return;
    }
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      setErrorLocal('El monto debe ser mayor a cero');
      return;
    }
    if (parseFloat(formData.monto) > saldoPendiente) {
      setErrorLocal('El monto no puede superar el saldo pendiente');
      return;
    }
    if (['tarjeta', 'transferencia', 'mixto'].includes(formData.metodo_pago) && !formData.banco) {
      setErrorLocal('Selecciona un banco');
      return;
    }
    setErrorLocal('');
    // Enviamos el saldo pendiente para validación en el padre
    onSave({ ...formData, saldo_pendiente: saldoPendiente });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Nuevo Abono</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Crédito (Cliente - Saldo pendiente) *</label>
            <select
              name="credito_id"
              value={formData.credito_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Selecciona un crédito --</option>
              {creditos.map((cred) => (
                <option key={cred.id} value={cred.id}>
                  {cred.clientes?.nombre || 'Cliente'} - ${cred.saldo_pendiente?.toFixed(2) || '0.00'}
                </option>
              ))}
            </select>
          </div>
          {formData.credito_id && (
            <div className="form-group saldo-info">
              <label>Saldo pendiente: <strong>${saldoPendiente?.toFixed(2) || '0.00'}</strong></label>
            </div>
          )}
          <div className="form-group">
            <label>Monto a abonar *</label>
            <input
              type="number"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Método de Pago *</label>
            <select
              name="metodo_pago"
              value={formData.metodo_pago}
              onChange={handleChange}
              required
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>
          {(formData.metodo_pago === 'tarjeta' || formData.metodo_pago === 'transferencia' || formData.metodo_pago === 'mixto') && (
            <div className="form-group">
              <label>Banco {formData.metodo_pago !== 'mixto' && '*'}</label>
              <select
                name="banco"
                value={formData.banco}
                onChange={handleChange}
                required={formData.metodo_pago !== 'mixto'}
              >
                <option value="">-- Seleccionar --</option>
                {bancos.map((b) => (
                  <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Fecha</label>
            <input
              type="datetime-local"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Observaciones</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="2"
              placeholder="Opcional"
            />
          </div>
          {errorLocal && <div className="error-local">{errorLocal}</div>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalAgregarAbono;