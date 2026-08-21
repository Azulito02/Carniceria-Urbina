import React from 'react';
import './TablaProductos.css';

function TablaProductos({ productos, loading, onEditar, onEliminar, categorias, unidades }) {
  if (loading) {
    return (
      <div className="loading-spinner">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="tabla-productos">
      <table>
        <thead>
          <tr>
            <th>Código</th>
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
              <td colSpan="6" className="sin-productos">No hay productos registrados</td>
            </tr>
          ) : (
            productos.map((p) => (
              <tr key={p.id}>
                <td className="codigo">{p.codigo_barras || '-'}</td>
                <td className="nombre">{p.nombre}</td>
                <td className="categoria">
                  {categorias.find(c => c.value === p.categoria)?.label || p.categoria}
                </td>
                <td className="marca">{p.marca || '-'}</td>
                <td className="unidad">
                  {unidades.find(u => u.value === p.unidad_medida)?.label || p.unidad_medida}
                </td>
                <td className="acciones">
                  <button className="btn-editar" onClick={() => onEditar(p)} title="Editar">
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn-eliminar" onClick={() => onEliminar(p)} title="Eliminar">
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ✅ ESTO ES LO QUE ESTABA FALTANDO
export default TablaProductos;