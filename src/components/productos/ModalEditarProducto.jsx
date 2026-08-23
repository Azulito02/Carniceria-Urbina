import React, { useState, useEffect } from 'react';
import './ModalEditarProducto.css';

function ModalEditarProducto({ 
  isOpen, 
  onClose, 
  onSave, 
  producto, 
  categorias, 
  unidades, 
  loading 
}) {
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'carnes_res',
    marca: '',
    unidad_medida: 'libra',
  });

  useEffect(() => {
    if (producto) {
      setFormData({
        nombre: producto.nombre || '',
        categoria: producto.categoria || 'carnes_res',
        marca: producto.marca || '',
        unidad_medida: producto.unidad_medida || 'libra',
      });
    }
  }, [producto]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!producto || !producto.id) {
      alert('Error: No hay producto seleccionado');
      return;
    }

    if (!formData.nombre || formData.nombre.trim() === '') {
      alert('El nombre del producto es obligatorio');
      return;
    }

    await onSave(producto.id, formData);
  };

  return (
    <div className="modal-editar-overlay" onClick={onClose}>
      <div className="modal-editar-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-editar-header">
          <h2>✏️ Editar Producto</h2>
          <button className="modal-editar-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-editar-field">
            <label>Nombre del producto *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="modal-editar-field">
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

          <div className="modal-editar-field">
            <label>Marca</label>
            <input
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
            />
          </div>

          <div className="modal-editar-field">
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

          <div className="modal-editar-buttons">
            <button type="button" className="btn-editar-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-editar-guardar" disabled={loading}>
              {loading ? 'Guardando...' : 'Actualizar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalEditarProducto;