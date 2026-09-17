import React, { useState } from 'react';

const TablaVenta = ({
  productos,
  lineasVenta,
  setLineasVenta,
  preciosCliente
}) => {
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');

  // Al seleccionar producto, autocompletar precio si el cliente ya lo tiene
  const handleProductoChange = (productoId) => {
    setProductoSeleccionado(productoId);
    
    if (productoId && preciosCliente[productoId]) {
      setPrecio(preciosCliente[productoId].toString());
    } else {
      setPrecio('');
    }
  };

  // Agregar producto a la venta
  const agregarLinea = () => {
    if (!productoSeleccionado) return alert('Selecciona un producto');
    if (!cantidad || parseFloat(cantidad) <= 0) return alert('Ingresa una cantidad válida');
    if (!precio || parseFloat(precio) <= 0) return alert('Ingresa un precio válido');

    const producto = productos.find(p => p.id === parseInt(productoSeleccionado));
    if (!producto) return;

    const nuevaLinea = {
      id_temp: Date.now(),
      producto_id: producto.id,
      nombre: producto.nombre,
      unidad_medida: producto.unidad_medida,
      cantidad: parseFloat(cantidad),
      precio_unitario: parseFloat(precio),
      total: parseFloat(cantidad) * parseFloat(precio)
    };

    setLineasVenta(prev => [...prev, nuevaLinea]);
    
    // Limpiar
    setProductoSeleccionado('');
    setCantidad('');
    setPrecio('');
  };

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
      {/* FORMULARIO AGREGAR PRODUCTO */}
      <div className="agregar-producto-venta">
        <div className="form-grupo-producto">
          <label className="form-label">
            <i className="fas fa-box"></i> Producto
          </label>
          <select
            value={productoSeleccionado}
            onChange={(e) => handleProductoChange(e.target.value)}
            className="form-select"
          >
            <option value="">Seleccionar producto...</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.marca ? `(${p.marca})` : ''} - {p.unidad_medida}
              </option>
            ))}
          </select>
        </div>

        <div className="form-grupo-cantidad">
          <label className="form-label">
            <i className="fas fa-weight-hanging"></i> Cantidad
          </label>
          <input
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="0.00"
            className="form-input"
            step="0.01"
            min="0"
          />
        </div>

        <div className="form-grupo-precio">
          <label className="form-label">
            <i className="fas fa-dollar-sign"></i> Precio
          </label>
          <input
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="0.00"
            className="form-input"
            step="0.01"
            min="0"
          />
        </div>

        <div className="form-grupo-btn">
          <button className="btn-agregar-linea" onClick={agregarLinea}>
            <i className="fas fa-plus-circle"></i> Agregar
          </button>
        </div>
      </div>

      {/* TABLA DE LÍNEAS */}
      {lineasVenta.length > 0 && (
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
                  <td className="producto">{linea.nombre}</td>
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
      )}

      {/* TOTAL */}
      {lineasVenta.length > 0 && (
        <div className="total-venta">
          <span className="total-label">TOTAL:</span>
          <span className="total-valor">C${total.toFixed(2)}</span>
        </div>
      )}

      {lineasVenta.length === 0 && (
        <div className="sin-lineas">
          <i className="fas fa-shopping-cart"></i>
          <p>No hay productos en la venta</p>
          <span>Agrega productos usando el formulario de arriba</span>
        </div>
      )}
    </div>
  );
};

export default TablaVenta;