import React, { useState, useEffect } from 'react';
import './ModalEditarCliente.css';

function ModalEditarCliente({ isOpen, onClose, onSave, cliente, loading }) {
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: ''
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre || '',
        direccion: cliente.direccion || ''
      });
    }
  }, [cliente]);

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

    await onSave(cliente.id, formData);
  };

  return (
    <div className="modal-editar-overlay" onClick={onClose}>
      <div className="modal-editar-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-editar-header">
          <h2>✏️ Editar Cliente</h2>
          <button className="modal-editar-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-editar-field">
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

          <div className="modal-editar-field">
            <label>Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Dirección del cliente"
            />
          </div>

          <div className="modal-editar-buttons">
            <button type="button" className="btn-editar-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-editar-guardar" disabled={loading}>
              {loading ? 'Guardando...' : 'Actualizar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalEditarCliente;