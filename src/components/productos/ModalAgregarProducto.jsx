import React, { useState } from 'react';
import './ModalAgregarProducto.css';

function ModalAgregarProducto({ isOpen, onClose, onSave, categorias, unidades, loading }) {
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'carnes_res',
    marca: '',
    unidad_medida: 'libra',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || formData.nombre.trim() === '') {
      alert('El nombre del producto es obligatorio');
      return;
    }

    await onSave(formData);
    setFormData({
      nombre: '',
      categoria: 'carnes_res',
      marca: '',
      unidad_medida: 'libra',
    });
  };

  return (
    <div className="modal-agregar-overlay" onClick={onClose}>
      <div className="modal-agregar-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-agregar-header">
          <h2>➕ Agregar Producto</h2>
          <button className="modal-agregar-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-agregar-field">
            <label>Nombre del producto *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="modal-agregar-field">
            <label>Categoría *</label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              required
            >
              {categorias && categorias.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="modal-agregar-field">
            <label>Marca</label>
            <input
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
            />
          </div>

          <div className="modal-agregar-field">
            <label>Unidad de medida *</label>
            <select
              name="unidad_medida"
              value={formData.unidad_medida}
              onChange={handleChange}
              required
            >
              {unidades && unidades.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          <div className="modal-agregar-buttons">
            <button type="button" className="btn-agregar-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-agregar-guardar" disabled={loading}>
              {loading ? 'Guardando...' : 'Agregar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalAgregarProducto;