
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
        <span>
          Haz clic en "Agregar Proveedor" para comenzar
        </span>
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
              <tr
                key={prov.id}
                className={prov._local ? 'fila-local' : ''}
              >
                <td className="numero">
                  {index + 1}
                </td>

                <td className="nombre">
                  {prov.nombre_empresa}

                  {prov._local && (
                    <span className="badge-local">
                      📝 Local
                    </span>
                  )}
                </td>

                <td className="contacto">
                  {prov.nombre_vendedor || '—'}
                </td>

                <td className="categorias">
                  {prov.categorias &&
                  prov.categorias.length > 0 ? (
                    <div className="categorias-badges">
                      {prov.categorias.map((cat) => (
                        <span
                          key={cat}
                          className={`cat-badge cat-${cat}`}
                        >
                          {getEtiquetaCategoria
                            ? getEtiquetaCategoria(cat)
                            : cat}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="sin-categorias">
                      Sin categorías
                    </span>
                  )}
                </td>

                <td className="acciones">
                  <div className="acciones-botones">
                    <button
                      type="button"
                      className="btn-editar btn-icon-only"
                      onClick={() => onEditar(prov)}
                      title="Editar proveedor"
                      aria-label={`Editar ${prov.nombre_empresa}`}
                    >
                      <i
                        className="fas fa-edit"
                        aria-hidden="true"
                      ></i>
                    </button>

                    <button
                      type="button"
                      className="btn-eliminar btn-icon-only"
                      onClick={() => onEliminar(prov)}
                      title="Eliminar proveedor"
                      aria-label={`Eliminar ${prov.nombre_empresa}`}
                    >
                      <i
                        className="fas fa-trash"
                        aria-hidden="true"
                      ></i>
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
