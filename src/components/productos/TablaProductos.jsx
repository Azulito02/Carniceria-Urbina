import React from 'react';
import './TablaProductos.css';

function TablaProductos({ 
  productos, 
  loading, 
  onEditar, 
  onEliminar, 
  categorias, 
  unidades 
}) {
  if (loading) {
    return (
      <div className="loading-spinner">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando productos...</p>
      </div>
    );
  }

  const getCategoriaLabel = (categoriaValue) => {
    if (!categorias || !Array.isArray(categorias)) return categoriaValue || '-';
    const categoria = categorias.find(c => c.value === categoriaValue);
    return categoria?.label || categoriaValue || '-';
  };

  const getUnidadLabel = (unidadValue) => {
    if (!unidades || !Array.isArray(unidades)) return unidadValue || '-';
    const unidad = unidades.find(u => u.value === unidadValue);
    return unidad?.label || unidadValue || '-';
  };

  return (
    <div className="tabla-productos">
      <div className="tabla-header">
        <h3>📋 Lista de Productos</h3>
        <span className="total-productos">{productos.length} productos</span>
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Marca</th>
              <th>Unidad</th>
              <th className="acciones-header">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan="5" className="sin-productos">
                  <i className="fas fa-box-open"></i>
                  <p>No hay productos registrados</p>
                  <span className="sin-productos-sub">
                    {loading ? 'Cargando...' : 'Haz clic en "Agregar Producto" para comenzar'}
                  </span>
                </td>
              </tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="producto-row">
                  <td className="nombre">
                    <div className="producto-info">
                      <span className="producto-nombre">{p.nombre}</span>
                    </div>
                  </td>
                  <td className="categoria">
                    <span className="categoria-badge">
                      {getCategoriaLabel(p.categoria)}
                    </span>
                  </td>
                  <td className="marca">{p.marca || '-'}</td>
                  <td className="unidad">
                    <span className="unidad-badge">
                      {getUnidadLabel(p.unidad_medida)}
                    </span>
                  </td>
                  <td className="acciones">
                    <div className="acciones-buttons">
                      <button 
                        className="btn-editar" 
                        onClick={() => onEditar(p)} 
                        title="Editar producto"
                      >
                        <i className="fas fa-edit"></i>
                        <span className="btn-text">Editar</span>
                      </button>
                      
                      <button 
                        className="btn-eliminar" 
                        onClick={() => onEliminar(p)} 
                        title="Eliminar producto"
                      >
                        <i className="fas fa-trash"></i>
                        <span className="btn-text">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TablaProductos;