
import React from 'react';
import './TablaClientes.css';

function TablaClientes({
  clientes,
  loading,
  onEditar,
  onEliminar
}) {
  if (loading) {
    return (
      <div className="loading-spinner">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="tabla-clientes">
      <div className="tabla-header">
        <h3>📋 Lista de Clientes</h3>

        <span className="total-clientes">
          {clientes.length} clientes
        </span>
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Dirección</th>
              <th className="acciones-header">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan="4" className="sin-clientes">
                  <i className="fas fa-users-slash"></i>
                  <p>No hay clientes registrados</p>
                  <span className="sin-clientes-sub">
                    Haz clic en "Agregar Cliente" para comenzar
                  </span>
                </td>
              </tr>
            ) : (
              clientes.map((cliente, index) => (
                <tr key={cliente.id} className="cliente-row">
                  <td className="numero">
                    {index + 1}
                  </td>

                  <td className="nombre">
                    {cliente.nombre}
                  </td>

                  <td className="direccion">
                    {cliente.direccion || '-'}
                  </td>

                  <td className="acciones">
                    <div className="acciones-buttons">
                      <button
                        type="button"
                        className="btn-editar btn-icon-only"
                        onClick={() => onEditar(cliente)}
                        title="Editar cliente"
                        aria-label={`Editar ${cliente.nombre}`}
                      >
                        <i
                          className="fas fa-edit"
                          aria-hidden="true"
                        ></i>
                      </button>

                      <button
                        type="button"
                        className="btn-eliminar btn-icon-only"
                        onClick={() => onEliminar(cliente)}
                        title="Eliminar cliente"
                        aria-label={`Eliminar ${cliente.nombre}`}
                      >
                        <i
                          className="fas fa-trash"
                          aria-hidden="true"
                        ></i>
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

export default TablaClientes;
