import React from 'react';

const TablaProveedores = ({
  proveedores,
  loading,
  onEditar,
  onEliminar,
  getEtiquetaCategoria
}) => {
  if (loading) {
    return (
      <div className="tabla-loading">
        <div className="spinner"></div>
        <p>Cargando proveedores...</p>
      </div>
    );
  }

  if (!proveedores || proveedores.length === 0) {
    return (
      <div className="tabla-vacia">
        <i className="fas fa-truck"></i>
        <p>No hay proveedores registrados</p>
        <span>Haz clic en "Agregar Proveedor" para comenzar</span>
      </div>
    );
  }

  return (
    <div className="tabla-proveedores-container">
      <div className="tabla-scroll">
        <table className="tabla-proveedores">
          <thead>
            <tr>
              <th>#</th>
              <th>Empresa</th>
              <th>Vendedor</th>
              <th>Categorías</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((prov, index) => (
              <tr key={prov.id} className={prov._local ? 'fila-local' : ''}>
                <td className="numero">{index + 1}</td>
                <td className="nombre">
                  {prov.nombre_empresa}
                  {prov._local && <span className="badge-local">📝 Local</span>}
                </td>
                <td className="contacto">{prov.nombre_vendedor || '—'}</td>
                <td className="categorias">
                  {prov.categorias && prov.categorias.length > 0 ? (
                    <div className="categorias-badges">
                      {prov.categorias.map(cat => (
                        <span key={cat} className={`cat-badge cat-${cat}`}>
                          {getEtiquetaCategoria ? getEtiquetaCategoria(cat) : cat}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="sin-categorias">Sin categorías</span>
                  )}
                </td>
                <td className="acciones">
                  <div className="acciones-botones">
                    <button
                      className="btn-editar"
                      onClick={() => onEditar(prov)}
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                      <span>Editar</span>
                    </button>
                    <button
                      className="btn-eliminar"
                      onClick={() => onEliminar(prov)}
                      title="Eliminar"
                    >
                      <i className="fas fa-trash-alt"></i>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TablaProveedores;