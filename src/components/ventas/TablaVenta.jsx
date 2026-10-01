import React from 'react';

const TablaVenta = ({
  lineasVenta,
  setLineasVenta,
  onAbrirModalAgregar
}) => {
  // Editar precio de una línea
  const editarPrecio = (id_temp, nuevoPrecio) => {
    setLineasVenta(prev =>
      prev.map(l =>
        l.id_temp === id_temp
          ? { ...l, precio_unitario: parseFloat(nuevoPrecio) || 0, total: l.cantidad * (parseFloat(nuevoPrecio) || 0) }
          : l
      )
    );
  };

  // Editar cantidad de una línea
  const editarCantidad = (id_temp, nuevaCantidad) => {
    setLineasVenta(prev =>
      prev.map(l =>
        l.id_temp === id_temp
          ? { ...l, cantidad: parseFloat(nuevaCantidad) || 0, total: (parseFloat(nuevaCantidad) || 0) * l.precio_unitario }
          : l
      )
    );
  };

  // Eliminar línea
  const eliminarLinea = (id_temp) => {
    setLineasVenta(prev => prev.filter(l => l.id_temp !== id_temp));
  };

  const total = lineasVenta.reduce((sum, l) => sum + l.total, 0);

  return (
    <div className="tabla-venta-container">
      {/* HEADER CON BOTÓN AGREGAR */}
      <div className="tabla-venta-header">
        <h3>
          <i className="fas fa-shopping-cart"></i> Productos de la Venta
        </h3>
        <button className="btn-abrir-modal-agregar" onClick={onAbrirModalAgregar}>
          <i className="fas fa-plus-circle"></i> Agregar Producto
        </button>
      </div>

      {/* TABLA DE LÍNEAS */}
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
                    <td className="numero">{index + 1}</td>
                    <td className="producto">
                      {linea.nombre}
                      {linea.marca && <span className="marca-producto"> ({linea.marca})</span>}
                    </td>
                    <td className="unidad">
                      <span className="unidad-badge">{linea.unidad_medida}</span>
                    </td>
                    <td className="cantidad">
                      <input
                        type="number"
                        value={linea.cantidad}
                        onChange={(e) => editarCantidad(linea.id_temp, e.target.value)}
                        className="input-tabla"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="precio">
                      <input
                        type="number"
                        value={linea.precio_unitario}
                        onChange={(e) => editarPrecio(linea.id_temp, e.target.value)}
                        className="input-tabla"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="total">
                      <strong>C${linea.total.toFixed(2)}</strong>
                    </td>
                    <td className="acciones">
                      <button
                        className="btn-eliminar-linea"
                        onClick={() => eliminarLinea(linea.id_temp)}
                        title="Eliminar"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTAL */}
          <div className="total-venta">
            <span className="total-label">TOTAL:</span>
            <span className="total-valor">C${total.toFixed(2)}</span>
          </div>
        </>
      ) : (
        <div className="sin-lineas">
          <i className="fas fa-shopping-cart"></i>
          <p>No hay productos en la venta</p>
          <span>Haz clic en "Agregar Producto" para comenzar</span>
          <button className="btn-abrir-modal-agregar-grande" onClick={onAbrirModalAgregar}>
            <i className="fas fa-plus-circle"></i> Agregar Producto
          </button>
        </div>
      )}
    </div>
  );
};

export default TablaVenta;