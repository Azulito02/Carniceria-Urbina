import React, { useState, useEffect } from 'react';
import './ModalProveedor.css';

const ModalEditarProveedor = ({
  isOpen,
  onClose,
  onSave,
  proveedor,
  categoriasDisponibles,
  getEtiquetaCategoria,
  loading
}) => {
  const [formData, setFormData] = useState({
    nombre_empresa: '',
    nombre_vendedor: '',
    categorias: []
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && proveedor) {
      setFormData({
        nombre_empresa: proveedor.nombre_empresa || '',
        nombre_vendedor: proveedor.nombre_vendedor || '',
        categorias: proveedor.categorias || []
      });
      setError('');
    }
  }, [isOpen, proveedor]);

  const toggleCategoria = (cat) => {
    setFormData(prev => {
      const yaEsta = prev.categorias.includes(cat);
      return {
        ...prev,
        categorias: yaEsta
          ? prev.categorias.filter(c => c !== cat)
          : [...prev.categorias, cat]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre_empresa.trim()) {
      setError('El nombre de la empresa es obligatorio');
      return;
    }

    if (formData.categorias.length === 0) {
      setError('Selecciona al menos una categoría');
      return;
    }

    const success = await onSave(proveedor.id, formData);
    if (success) onClose();
  };

  if (!isOpen || !proveedor) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-proveedor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">
            <i className="fas fa-edit"></i> Editar Proveedor
          </h2>
          <button className="modal-cerrar" onClick={onClose}>
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

            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-building"></i> Nombre de la Empresa *
              </label>
              <input
                type="text"
                value={formData.nombre_empresa}
                onChange={(e) => setFormData({ ...formData, nombre_empresa: e.target.value })}
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-user"></i> Nombre del Vendedor
              </label>
              <input
                type="text"
                value={formData.nombre_vendedor}
                onChange={(e) => setFormData({ ...formData, nombre_vendedor: e.target.value })}
                className="form-input"
              />
            </div>

            {/* ===== CATEGORÍAS ===== */}
            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-tags"></i> Categorías que vende *
              </label>
              <div className="categorias-selector">
                {categoriasDisponibles.length === 0 ? (
                  <p className="sin-categorias-disponibles">
                    No hay categorías en productos.
                  </p>
                ) : (
                  categoriasDisponibles.map(cat => (
                    <label
                      key={cat}
                      className={`categoria-checkbox ${formData.categorias.includes(cat) ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.categorias.includes(cat)}
                        onChange={() => toggleCategoria(cat)}
                      />
                      <span className="checkmark"></span>
                      <span className="categoria-nombre">
                        {getEtiquetaCategoria ? getEtiquetaCategoria(cat) : cat}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {formData.categorias.length > 0 && (
                <p className="categorias-seleccionadas">
                  <i className="fas fa-check-circle"></i>
                  {formData.categorias.length} categoría{formData.categorias.length > 1 ? 's' : ''} seleccionada{formData.categorias.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal-guardar" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Actualizando...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> Actualizar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarProveedor;