import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import './Inventario.css';

function Inventario() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [inventarioActual, setInventarioActual] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [cargandoInventario, setCargandoInventario] = useState(false);

  // ===== CARGAR PRODUCTOS =====
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, categoria, marca, unidad_medida')
        .order('nombre');

      if (error) throw error;
      setProductos(data || []);
    } catch (err) {
      console.error('Error cargando productos:', err);
      setError('Error al cargar productos');
    }
  };

  // ===== CARGAR INVENTARIO POR FECHA =====
  const cargarInventarioPorFecha = async (fecha) => {
    if (!fecha) {
      setInventarioActual([]);
      return;
    }

    try {
      setCargandoInventario(true);
      setError(null);
      setExito(null);

      const { data, error } = await supabase
        .from('inventario')
        .select(`
          id,
          producto_id,
          cantidad,
          fecha,
          productos (
            id,
            nombre,
            categoria,
            marca,
            unidad_medida
          )
        `)
        .eq('fecha', fecha)
        .order('producto_id');

      if (error) throw error;

      if (data && data.length > 0) {
        const items = data.map(item => ({
          id: item.id,
          producto_id: item.producto_id,
          nombre: item.productos?.nombre || 'Producto eliminado',
          categoria: item.productos?.categoria || '-',
          marca: item.productos?.marca || '-',
          unidad_medida: item.productos?.unidad_medida || '-',
          cantidad: item.cantidad,
          fecha: item.fecha
        }));
        setInventarioActual(items);
        setExito(`📋 Inventario cargado para el ${fecha} - ${items.length} productos`);
      } else {
        setInventarioActual([]);
        setExito(`📅 No hay inventario registrado para el ${fecha}`);
      }
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setError('Error al cargar el inventario');
    } finally {
      setCargandoInventario(false);
    }
  };

  // ===== AGREGAR PRODUCTO AL INVENTARIO =====
  const agregarProducto = () => {
    if (!productoSeleccionado) {
      setError('Selecciona un producto');
      return;
    }

    if (!cantidad || parseFloat(cantidad) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    const producto = productos.find(p => p.id === parseInt(productoSeleccionado));
    
    // Verificar si el producto ya está en el inventario actual
    const existe = inventarioActual.find(item => item.producto_id === parseInt(productoSeleccionado));
    
    if (existe) {
      // Actualizar cantidad
      const nuevosItems = inventarioActual.map(item =>
        item.producto_id === parseInt(productoSeleccionado)
          ? { ...item, cantidad: parseFloat(cantidad) }
          : item
      );
      setInventarioActual(nuevosItems);
      setExito(`✅ Cantidad actualizada para "${producto.nombre}"`);
    } else {
      // Agregar nuevo producto
      setInventarioActual([
        ...inventarioActual,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          categoria: producto.categoria,
          marca: producto.marca || '-',
          unidad_medida: producto.unidad_medida,
          cantidad: parseFloat(cantidad),
          fecha: fecha
        }
      ]);
      setExito(`✅ "${producto.nombre}" agregado al inventario`);
    }

    // Limpiar campos
    setProductoSeleccionado('');
    setCantidad('');
    setError(null);
  };

  // ===== ELIMINAR PRODUCTO DEL INVENTARIO =====
  const eliminarDelInventario = (index) => {
    const producto = inventarioActual[index];
    const nuevosItems = inventarioActual.filter((_, i) => i !== index);
    setInventarioActual(nuevosItems);
    setExito(`🗑️ "${producto.nombre}" eliminado del inventario`);
  };

  // ===== GUARDAR INVENTARIO =====
  const guardarInventario = async () => {
    if (inventarioActual.length === 0) {
      setError('Agrega al menos un producto al inventario');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Primero, eliminar todos los registros existentes para esta fecha
      const { error: deleteError } = await supabase
        .from('inventario')
        .delete()
        .eq('fecha', fecha);

      if (deleteError) throw deleteError;

      // Preparar datos para insertar
      const datosInventario = inventarioActual.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        fecha: fecha
      }));

      // Insertar nuevo inventario
      const { data, error } = await supabase
        .from('inventario')
        .insert(datosInventario)
        .select();

      if (error) throw error;

      setExito(`✅ Inventario guardado exitosamente - ${data.length} productos`);
      
      // Actualizar los IDs
      if (data) {
        const itemsActualizados = inventarioActual.map((item, index) => ({
          ...item,
          id: data[index]?.id || item.id
        }));
        setInventarioActual(itemsActualizados);
      }

    } catch (err) {
      console.error('Error guardando inventario:', err);
      setError('Error al guardar el inventario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== NUEVO INVENTARIO =====
  const nuevoInventario = () => {
    setInventarioActual([]);
    setFecha(new Date().toISOString().split('T')[0]);
    setFiltroFecha('');
    setError(null);
    setExito('📝 Nuevo inventario creado');
    setProductoSeleccionado('');
    setCantidad('');
  };

  // ===== CALCULAR TOTAL DE PRODUCTOS =====
  const totalProductos = inventarioActual.length;
  const totalCantidad = inventarioActual.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="inventario-container">
      <Encabezado />

      <div className="inventario-content">
        <div className="inventario-header">
          <div className="inventario-titulo">
            <h1>📊 Inventario</h1>
            <p>Gestión de inventario de productos</p>
          </div>
          <button className="btn-nuevo" onClick={nuevoInventario}>
            <i className="fas fa-plus"></i> Nuevo Inventario
          </button>
        </div>

        {/* Mensajes de error y éxito */}
        {error && (
          <div className="inventario-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {exito && (
          <div className="inventario-exito">
            <i className="fas fa-check-circle"></i>
            <span>{exito}</span>
            <button onClick={() => setExito(null)} className="exito-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Filtro de fecha */}
        <div className="filtro-fecha-container">
          <div className="filtro-fecha">
            <label>
              <i className="fas fa-calendar"></i>
              Buscar inventario por fecha:
            </label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => {
                setFiltroFecha(e.target.value);
                cargarInventarioPorFecha(e.target.value);
              }}
              className="fecha-input"
            />
            {filtroFecha && (
              <button 
                className="btn-limpiar-fecha"
                onClick={() => {
                  setFiltroFecha('');
                  setInventarioActual([]);
                  setExito(null);
                }}
              >
                <i className="fas fa-times"></i> Limpiar
              </button>
            )}
          </div>

          <div className="fecha-actual">
            <span className="fecha-label">Fecha del inventario:</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="fecha-input"
              disabled={filtroFecha !== ''}
            />
          </div>
        </div>

        {/* Formulario para agregar productos */}
        <div className="agregar-producto-container">
          <div className="agregar-producto-form">
            <div className="form-group">
              <label>Producto *</label>
              <select
                value={productoSeleccionado}
                onChange={(e) => setProductoSeleccionado(e.target.value)}
                className="form-select"
                disabled={filtroFecha !== ''}
              >
                <option value="">Seleccionar producto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.marca ? `(${p.marca})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cantidad *</label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
                min="0"
                disabled={filtroFecha !== ''}
              />
            </div>

            <div className="form-group">
              <label>&nbsp;</label>
              <button 
                className="btn-agregar" 
                onClick={agregarProducto}
                disabled={filtroFecha !== ''}
              >
                <i className="fas fa-plus"></i> Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de inventario actual */}
        <div className="inventario-tabla-container">
          <div className="inventario-tabla-header">
            <h3>📋 Inventario Actual</h3>
            <div className="inventario-resumen">
              <span>Productos: <strong>{totalProductos}</strong></span>
              <span>Total unidades: <strong>{totalCantidad.toFixed(2)}</strong></span>
            </div>
          </div>

          {cargandoInventario ? (
            <div className="loading-spinner">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Cargando inventario...</p>
            </div>
          ) : (
            <div className="tabla-scroll">
              <table className="inventario-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Marca</th>
                    <th>Unidad</th>
                    <th>Cantidad</th>
                    <th className="acciones-header">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioActual.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="sin-productos">
                        <i className="fas fa-box-open"></i>
                        <p>No hay productos en el inventario</p>
                        <span className="sin-productos-sub">
                          {filtroFecha 
                            ? 'No hay inventario registrado para esta fecha'
                            : 'Agrega productos usando el formulario de arriba'}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    inventarioActual.map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="numero">{index + 1}</td>
                        <td className="producto-nombre">{item.nombre}</td>
                        <td className="categoria">
                          <span className="categoria-badge">{item.categoria}</span>
                        </td>
                        <td className="marca">{item.marca}</td>
                        <td className="unidad">
                          <span className="unidad-badge">{item.unidad_medida}</span>
                        </td>
                        <td className="cantidad">
                          <strong>{item.cantidad.toFixed(2)}</strong>
                        </td>
                        <td className="acciones">
                          <button 
                            className="btn-eliminar-item" 
                            onClick={() => eliminarDelInventario(index)}
                            disabled={filtroFecha !== ''}
                            title="Eliminar del inventario"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="inventario-acciones">
          <button 
            className="btn-guardar" 
            onClick={guardarInventario}
            disabled={loading || inventarioActual.length === 0 || filtroFecha !== ''}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Guardando...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> Guardar Inventario
              </>
            )}
          </button>

          <button 
            className="btn-limpiar" 
            onClick={nuevoInventario}
            disabled={loading}
          >
            <i className="fas fa-undo"></i> Nuevo Inventario
          </button>
        </div>
      </div>

      {/* Navegación inferior */}
      <div className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/')}>
          <i className="fas fa-home"></i>
          <span>Inicio</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/productos')}>
          <i className="fas fa-box"></i>
          <span>Productos</span>
        </button>
        <button className="nav-item active" onClick={() => navigate('/inventario')}>
          <i className="fas fa-warehouse"></i>
          <span>Inventario</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/ventas')}>
          <i className="fas fa-cash-register"></i>
          <span>Ventas</span>
        </button>
      </div>
    </div>
  );
}

export default Inventario;