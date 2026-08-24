import React, { useState } from 'react';
import './ModalAgregarCliente.css';

function ModalAgregarCliente({ isOpen, onClose, onSave, loading }) {
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || formData.nombre.trim() === '') {
      alert('El nombre del cliente es obligatorio');
      return;
    }

    await onSave(formData);
    setFormData({ nombre: '', direccion: '' });
  };

  return (
    <div className="modal-agregar-overlay" onClick={onClose}>
      <div className="modal-agregar-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-agregar-header">
          <h2>➕ Agregar Cliente</h2>
          <button className="modal-agregar-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-agregar-field">
            <label>Nombre del cliente *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="modal-agregar-field">
            <label>Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Dirección del cliente"
            />
          </div>

          <div className="modal-agregar-buttons">
            <button type="button" className="btn-agregar-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-agregar-guardar" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalAgregarCliente;