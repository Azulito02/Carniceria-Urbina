import React, { useState, useEffect } from 'react';
import './ModalAgregarProductoVenta.css';

const ModalAgregarProductoVenta = ({
  isOpen,
  onClose,
  productos,
  onAgregar,
  preciosCliente
}) => {
  const [itemsTemporales, setItemsTemporales] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState('');

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      setItemsTemporales([]);
      setProductoSeleccionado('');
      setCantidad('');
      setPrecio('');
      setError('');
    }
  }, [isOpen]);

  // Al cambiar producto, autocompletar precio si el cliente ya lo tiene
  const handleProductoChange = (productoId) => {
    setProductoSeleccionado(productoId);
    
    if (productoId && preciosCliente[productoId]) {
      setPrecio(preciosCliente[productoId].toString());
    } else {
      setPrecio('');
    }
  };

  // Agregar producto a la lista temporal (dentro del modal)
  const agregarAListaTemporal = () => {
    setError('');
    
    if (!productoSeleccionado) {
      setError('Selecciona un producto');
      return;
    }
    if (!cantidad || parseFloat(cantidad) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }
    if (!precio || parseFloat(precio) <= 0) {
      setError('Ingresa un precio válido');
      return;
    }

    const producto = productos.find(p => p.id === parseInt(productoSeleccionado));
    if (!producto) {
      setError('Producto no encontrado');
      return;
    }

    // Verificar si el producto ya está en la lista temporal
    const existe = itemsTemporales.find(i => i.producto_id === producto.id);
    
    if (existe) {
      // Actualizar cantidad si ya existe
      setItemsTemporales(prev =>
        prev.map(i =>
          i.producto_id === producto.id
            ? {
                ...i,
                cantidad: parseFloat(cantidad),
                precio_unitario: parseFloat(precio),
                total: parseFloat(cantidad) * parseFloat(precio)
              }
            : i
        )
      );
    } else {
      // Agregar nuevo
      const nuevoItem = {
        id_temp: Date.now(),
        producto_id: producto.id,
        nombre: producto.nombre,
        marca: producto.marca,
        unidad_medida: producto.unidad_medida,
        cantidad: parseFloat(cantidad),
        precio_unitario: parseFloat(precio),
        total: parseFloat(cantidad) * parseFloat(precio)
      };
      setItemsTemporales(prev => [...prev, nuevoItem]);
    }

    // Limpiar campos
    setProductoSeleccionado('');
    setCantidad('');
    setPrecio('');
    setError('');
  };

  // Editar cantidad de un item temporal
  const editarCantidadTemp = (id_temp, nuevaCantidad) => {
    setItemsTemporales(prev =>
      prev.map(i =>
        i.id_temp === id_temp
          ? { ...i, cantidad: parseFloat(nuevaCantidad) || 0, total: (parseFloat(nuevaCantidad) || 0) * i.precio_unitario }
          : i
      )
    );
  };

  // Editar precio de un item temporal
  const editarPrecioTemp = (id_temp, nuevoPrecio) => {
    setItemsTemporales(prev =>
      prev.map(i =>
        i.id_temp === id_temp
          ? { ...i, precio_unitario: parseFloat(nuevoPrecio) || 0, total: i.cantidad * (parseFloat(nuevoPrecio) || 0) }
          : i
      )
    );
  };

  // Eliminar item temporal
  const eliminarItemTemp = (id_temp) => {
    setItemsTemporales(prev => prev.filter(i => i.id_temp !== id_temp));
  };

  // Confirmar y agregar todos a la venta
  const handleAgregarTodos = () => {
    if (itemsTemporales.length === 0) {
      setError('Agrega al menos un producto a la lista');
      return;
    }

    // Enviar todos los items al padre
    itemsTemporales.forEach(item => {
      onAgregar(item);
    });

    onClose();
  };

  // Calcular total temporal
  const totalTemporal = itemsTemporales.reduce((sum, i) => sum + i.total, 0);

  if (!isOpen) return null;

  const productoActual = productos.find(p => p.id === parseInt(productoSeleccionado));
  const tienePrecioCliente = productoSeleccionado && preciosCliente[productoSeleccionado];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-agregar-producto-multiple" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">
            <i className="fas fa-plus-circle"></i> Agregar Productos
          </h2>
          <button className="modal-cerrar" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="modal-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {/* ===== FORMULARIO PARA AGREGAR A LA LISTA ===== */}
          <div className="agregar-item-container">
            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-box"></i> Producto
              </label>
              <select
                value={productoSeleccionado}
                onChange={(e) => handleProductoChange(e.target.value)}
                className="form-select"
                autoFocus
              >
                <option value="">Seleccionar producto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.marca ? `(${p.marca})` : ''} - {p.unidad_medida}
                  </option>
                ))}
              </select>
            </div>

            {productoActual && tienePrecioCliente && (
              <div className="info-precio-anterior">
                <i className="fas fa-history"></i>
                <span>Precio anterior: <strong>C${parseFloat(preciosCliente[productoSeleccionado]).toFixed(2)}</strong></span>
              </div>
            )}

            <div className="form-grupo-doble">
              <div className="form-grupo">
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

              <div className="form-grupo">
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
            </div>

            <button className="btn-agregar-a-lista" onClick={agregarAListaTemporal}>
              <i className="fas fa-plus"></i> Agregar a la lista
            </button>
          </div>

          {/* ===== LISTA TEMPORAL DE PRODUCTOS ===== */}
          {itemsTemporales.length > 0 && (
            <div className="lista-temporal">
              <div className="lista-temporal-header">
                <h4>
                  <i className="fas fa-list"></i> Productos a agregar ({itemsTemporales.length})
                </h4>
              </div>

              <div className="tabla-scroll-temporal">
                <table className="tabla-temporal">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>Precio</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsTemporales.map((item, index) => (
                      <tr key={item.id_temp}>
                        <td className="numero">{index + 1}</td>
                        <td className="producto">
                          {item.nombre}
                          {item.marca && <span className="marca-producto"> ({item.marca})</span>}
                        </td>
                        <td className="cantidad">
                          <input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => editarCantidadTemp(item.id_temp, e.target.value)}
                            className="input-tabla-temporal"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td className="precio">
                          <input
                            type="number"
                            value={item.precio_unitario}
                            onChange={(e) => editarPrecioTemp(item.id_temp, e.target.value)}
                            className="input-tabla-temporal"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td className="total">
                          <strong>C${item.total.toFixed(2)}</strong>
                        </td>
                        <td className="acciones">
                          <button
                            className="btn-eliminar-temporal"
                            onClick={() => eliminarItemTemp(item.id_temp)}
                            title="Eliminar"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="total-temporal">
                <span>TOTAL:</span>
                <strong>C${totalTemporal.toFixed(2)}</strong>
              </div>
            </div>
          )}

          {itemsTemporales.length === 0 && (
            <div className="sin-items-temporal">
              <i className="fas fa-shopping-basket"></i>
              <p>Agrega productos a la lista</p>
              <span>Usa el formulario de arriba para agregar uno o varios productos</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-modal-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="btn-modal-guardar" 
            onClick={handleAgregarTodos}
            disabled={itemsTemporales.length === 0}
          >
            <i className="fas fa-check"></i> Agregar {itemsTemporales.length > 0 ? `(${itemsTemporales.length})` : ''} a la Venta
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarProductoVenta;