
import React from 'react';

const TablaVenta = ({
  lineasVenta,
  setLineasVenta,
  onAbrirModalAgregar
}) => {

  // ===== EDITAR PRECIO DE UNA LÍNEA =====
  const editarPrecio = (id_temp, nuevoPrecio) => {
    setLineasVenta(prev =>
      prev.map(l =>
        l.id_temp === id_temp
          ? {
              ...l,
              precio_unitario: parseFloat(nuevoPrecio) || 0,
              total:
                l.cantidad * (parseFloat(nuevoPrecio) || 0)
            }
          : l
      )
    );
  };

  // ===== EDITAR CANTIDAD DE UNA LÍNEA =====
  const editarCantidad = (id_temp, nuevaCantidad) => {
    setLineasVenta(prev =>
      prev.map(l =>
        l.id_temp === id_temp
          ? {
              ...l,
              cantidad: parseFloat(nuevaCantidad) || 0,
              total:
                (parseFloat(nuevaCantidad) || 0) *
                l.precio_unitario
            }
          : l
      )
    );
  };

  // ===== ELIMINAR PRODUCTO DE LA VENTA =====
  const eliminarLinea = (id_temp) => {
    setLineasVenta(prev =>
      prev.filter(l => l.id_temp !== id_temp)
    );
  };

  // ===== TOTAL DE LA VENTA =====
  const total = lineasVenta.reduce(
    (sum, l) => sum + l.total,
    0
  );

  return (
    <div className="tabla-venta-container">

      {/* ===== ENCABEZADO CON ÚNICO BOTÓN ===== */}
      <div className="tabla-venta-header">
        <h3>
          <i className="fas fa-shopping-cart"></i>
          {' '}Productos de la Venta
        </h3>

        <button
          type="button"
          className="btn-abrir-modal-agregar"
          onClick={onAbrirModalAgregar}
        >
          <i className="fas fa-plus-circle"></i>
          {' '}Agregar Productos
        </button>
      </div>

      {/* ===== PRODUCTOS AGREGADOS ===== */}
      {lineasVenta.length > 0 ? (
        <>
          <div className="tabla-scroll-venta">
            <table className="tabla-venta">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Unidad</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {lineasVenta.map((linea, index) => (
                  <tr key={linea.id_temp}>

                    {/* NÚMERO */}
                    <td className="numero">
                      {index + 1}
                    </td>

                    {/* PRODUCTO */}
                    <td className="producto">
                      {linea.nombre}

                      {linea.marca && (
                        <span className="marca-producto">
                          {' '}({linea.marca})
                        </span>
                      )}
                    </td>

                    {/* UNIDAD */}
                    <td className="unidad">
                      <span className="unidad-badge">
                        {linea.unidad_medida}
                      </span>
                    </td>

                    {/* CANTIDAD EDITABLE */}
                    <td className="cantidad">
                      <input
                        type="number"
                        value={linea.cantidad}
                        onChange={(e) =>
                          editarCantidad(
                            linea.id_temp,
                            e.target.value
                          )
                        }
                        className="input-tabla"
                        step="0.01"
                        min="0"
                      />
                    </td>

                    {/* PRECIO EDITABLE */}
                    <td className="precio">
                      <input
                        type="number"
                        value={linea.precio_unitario}
                        onChange={(e) =>
                          editarPrecio(
                            linea.id_temp,
                            e.target.value
                          )
                        }
                        className="input-tabla"
                        step="0.01"
                        min="0"
                      />
                    </td>

                    {/* TOTAL DEL PRODUCTO */}
                    <td className="total">
                      <strong>
                        C${linea.total.toFixed(2)}
                      </strong>
                    </td>

                    {/* ELIMINAR PRODUCTO */}
                    <td className="acciones">
                      <button
                        type="button"
                        className="btn-eliminar-linea"
                        onClick={() =>
                          eliminarLinea(linea.id_temp)
                        }
                        title="Quitar producto"
                        aria-label={`Quitar ${linea.nombre}`}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== TOTAL GENERAL ===== */}
          <div className="total-venta">
            <span className="total-label">
              TOTAL:
            </span>

            <span className="total-valor">
              C${total.toFixed(2)}
            </span>
          </div>
        </>
      ) : (

        /* ===== VENTA SIN PRODUCTOS ===== */
        <div className="sin-lineas">
          <i className="fas fa-shopping-cart"></i>

          <p>
            No hay productos en la venta
          </p>

          <span>
            Utilizá el botón «Agregar Productos»
            de arriba para comenzar.
          </span>
        </div>

      )}

    </div>
  );
};

export default TablaVenta;
