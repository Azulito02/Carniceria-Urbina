import React, { useState } from 'react';
import './ModalAgregarProducto.css';

function ModalAgregarProducto({ isOpen, onClose, onSave, categorias, unidades, loading }) {
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'carnes_res',
    marca: '',
    unidad_medida: 'libra',
    codigo_barras: '',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
    if (!loading) {
      setFormData({
        nombre: '',
        categoria: 'carnes_res',
        marca: '',
        unidad_medida: 'libra',
        codigo_barras: '',
      });
    }
  };

  return (
    <div className="modal-agregar-overlay">
      <div className="modal-agregar-content">
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
              placeholder="Ej: Lomo de Res"
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
              {categorias.map(c => (
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
              placeholder="Ej: Carnes Don Juan"
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
              {unidades.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          <div className="modal-agregar-field">
            <label>Código de barras</label>
            <input
              type="text"
              name="codigo_barras"
              value={formData.codigo_barras}
              onChange={handleChange}
              placeholder="Ej: 7501234567890"
            />
          </div>

          <div className="modal-agregar-buttons">
            <button type="button" className="btn-agregar-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-agregar-guardar" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ ESTO ES LO QUE ESTABA FALTANDO
export default ModalAgregarProducto;