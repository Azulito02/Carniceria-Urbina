import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import PDFInventario from '../components/PDFInventario';
import { agregarOperacion, sincronizarOperaciones, obtenerOperacionesPendientes } from '../services/OfflineService';
import { guardarLocal, obtenerLocal } from '../utils/storage'; // ← AGREGAR OBJETOS LOCALES
import './Inventario.css';

function Inventario() {
  const navigate = useNavigate();
  
  const { 
    data: productos, 
    loading: loadingProductos,
    error: errorProductos,
    conectado,
    sincronizar
  } = useRealtimeSync('productos', 'productos_cache');

  const [loading, setLoading] = useState(false);
  const [inventarioActual, setInventarioActual] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);
  
  const [editandoId, setEditandoId] = useState(null);
  const [editandoProducto, setEditandoProducto] = useState('');
  const [editandoCantidad, setEditandoCantidad] = useState('');
  const [editandoFecha, setEditandoFecha] = useState('');

  // ===== CONTAR OPERACIONES PENDIENTES =====
  useEffect(() => {
    const contar = () => {
      const ops = obtenerOperacionesPendientes();
      setOperacionesPendientes(ops.length);
    };
    contar();
    const interval = setInterval(contar, 5000);
    return () => clearInterval(interval);
  }, []);

  // ===== PRODUCTOS DISPONIBLES (con fallback) =====
  const getProductos = () => {
    if (productos && productos.length > 0) {
      return productos;
    }
    return [
      { id: 1, nombre: 'Lomo Fino', categoria: 'carnes_res', marca: 'Tip-Top', unidad_medida: 'libra' },
      { id: 2, nombre: 'Pierna', categoria: 'carnes_res', marca: 'Kimby', unidad_medida: 'libra' },
      { id: 3, nombre: 'Pechuga', categoria: 'pollo', marca: 'Tip-Top', unidad_medida: 'libra' },
    ];
  };

  const productosDisponibles = getProductos();

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
      setEditandoId(null);

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

      if (error) {
        console.error('Error cargando inventario:', error);
        setError('Error al cargar el inventario: ' + error.message);
        setInventarioActual([]);
        setCargandoInventario(false);
        return;
      }

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
      console.error('Error inesperado:', err);
      setError('Error inesperado al cargar el inventario');
      setInventarioActual([]);
    } finally {
      setCargandoInventario(false);
    }
  };

  // ===== AGREGAR PRODUCTO AL INVENTARIO =====
  const agregarProducto = async () => {
    if (!productoSeleccionado) {
      setError('Selecciona un producto');
      return;
    }

    if (!cantidad || parseFloat(cantidad) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    try {
      setLoading(true);
      const producto = productosDisponibles.find(p => p.id === parseInt(productoSeleccionado));
      
      if (!producto) {
        setError('Producto no encontrado');
        setLoading(false);
        return;
      }

      const existe = inventarioActual.find(item => item.producto_id === parseInt(productoSeleccionado));
      
      if (existe) {
        const nuevosItems = inventarioActual.map(item =>
          item.producto_id === parseInt(productoSeleccionado)
            ? { ...item, cantidad: parseFloat(cantidad) }
            : item
        );
        setInventarioActual(nuevosItems);
        setExito(`✅ Cantidad actualizada para "${producto.nombre}"`);
      } else {
        const nuevoItem = {
          id: `temp_${Date.now()}_${inventarioActual.length}`,
          producto_id: producto.id,
          nombre: producto.nombre,
          categoria: producto.categoria,
          marca: producto.marca || '-',
          unidad_medida: producto.unidad_medida,
          cantidad: parseFloat(cantidad),
          fecha: fecha
        };
        setInventarioActual([...inventarioActual, nuevoItem]);
        setExito(`✅ "${producto.nombre}" agregado al inventario`);
      }

      setProductoSeleccionado('');
      setCantidad('');
      setError(null);
    } catch (err) {
      console.error('Error agregando producto:', err);
      setError('Error al agregar producto');
    } finally {
      setLoading(false);
    }
  };

  // ===== INICIAR EDICIÓN =====
  const iniciarEdicion = (item) => {
    if (!item || !item.id) {
      setError('Error: No se puede editar este registro');
      return;
    }
    
    setEditandoId(item.id);
    setEditandoProducto(item.producto_id ? item.producto_id.toString() : '');
    setEditandoCantidad(item.cantidad ? item.cantidad.toString() : '');
    setEditandoFecha(item.fecha || '');
  };

  // ===== CANCELAR EDICIÓN =====
  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoProducto('');
    setEditandoCantidad('');
    setEditandoFecha('');
  };

  // ===== ACTUALIZAR REGISTRO =====
  const actualizarRegistro = async () => {
    if (!editandoId) {
      setError('Error: No se puede actualizar sin un ID');
      return;
    }

    if (!editandoProducto || editandoProducto === '') {
      setError('Selecciona un producto');
      return;
    }

    const productoId = parseInt(editandoProducto);
    if (isNaN(productoId) || productoId <= 0) {
      setError('Producto no válido');
      return;
    }

    const cantidadNum = parseFloat(editandoCantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (!editandoFecha) {
      setError('Selecciona una fecha');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const producto = productosDisponibles.find(p => p.id === productoId);
      if (!producto) {
        setError('Producto no encontrado');
        setLoading(false);
        return;
      }

      // Si es un ID temporal (local)
      if (typeof editandoId === 'string' && editandoId.startsWith('temp_')) {
        const nuevosItems = inventarioActual.map(item => {
          if (item.id === editandoId) {
            return {
              ...item,
              producto_id: productoId,
              nombre: producto.nombre,
              categoria: producto.categoria,
              marca: producto.marca || '-',
              unidad_medida: producto.unidad_medida,
              cantidad: cantidadNum,
              fecha: editandoFecha
            };
          }
          return item;
        });
        setInventarioActual(nuevosItems);
        setEditandoId(null);
        setEditandoProducto('');
        setEditandoCantidad('');
        setEditandoFecha('');
        setExito(`✅ Registro actualizado correctamente`);
        setLoading(false);
        return;
      }

      // Con internet - actualizar en Supabase
      if (conectado) {
        const { data, error } = await supabase
          .from('inventario')
          .update({
            producto_id: productoId,
            cantidad: cantidadNum,
            fecha: editandoFecha
          })
          .eq('id', editandoId)
          .select();

        if (error) {
          setError('Error al actualizar: ' + error.message);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const nuevosItems = inventarioActual.map(item => {
            if (item.id === editandoId) {
              return {
                ...item,
                producto_id: productoId,
                nombre: producto.nombre,
                categoria: producto.categoria,
                marca: producto.marca || '-',
                unidad_medida: producto.unidad_medida,
                cantidad: cantidadNum,
                fecha: editandoFecha
              };
            }
            return item;
          });
          setInventarioActual(nuevosItems);
          setEditandoId(null);
          setEditandoProducto('');
          setEditandoCantidad('');
          setEditandoFecha('');
          setExito(`✅ Registro actualizado correctamente`);
          
          if (filtroFecha) {
            cargarInventarioPorFecha(filtroFecha);
          }
        }
        setLoading(false);
        return;
      }

      // Sin internet - guardar en cola
      agregarOperacion({
        tipo: 'UPDATE',
        tabla: 'inventario',
        datos: {
          producto_id: productoId,
          cantidad: cantidadNum,
          fecha: editandoFecha
        },
        id_registro: editandoId
      });

      const nuevosItems = inventarioActual.map(item => {
        if (item.id === editandoId) {
          return {
            ...item,
            producto_id: productoId,
            nombre: producto.nombre,
            categoria: producto.categoria,
            marca: producto.marca || '-',
            unidad_medida: producto.unidad_medida,
            cantidad: cantidadNum,
            fecha: editandoFecha
          };
        }
        return item;
      });
      setInventarioActual(nuevosItems);
      setEditandoId(null);
      setEditandoProducto('');
      setEditandoCantidad('');
      setEditandoFecha('');
      setExito(`📝 Registro actualizado localmente. Se sincronizará con internet.`);
      
      if (filtroFecha) {
        cargarInventarioPorFecha(filtroFecha);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al actualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== ELIMINAR PRODUCTO DEL INVENTARIO =====
  const eliminarDelInventario = (index) => {
    const producto = inventarioActual[index];
    const nuevosItems = inventarioActual.filter((_, i) => i !== index);
    setInventarioActual(nuevosItems);
    setExito(`🗑️ "${producto.nombre}" eliminado del inventario`);
  };

  // ===== ELIMINAR PRODUCTO DE LA BASE DE DATOS =====
  const eliminarDeBD = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${nombre}" del inventario?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Si es temporal
      if (typeof id === 'string' && id.startsWith('temp_')) {
        const nuevosItems = inventarioActual.filter(item => item.id !== id);
        setInventarioActual(nuevosItems);
        setExito(`🗑️ "${nombre}" eliminado del inventario`);
        setLoading(false);
        return;
      }

      if (conectado) {
        const { error } = await supabase
          .from('inventario')
          .delete()
          .eq('id', id);

        if (error) throw error;

        const nuevosItems = inventarioActual.filter(item => item.id !== id);
        setInventarioActual(nuevosItems);
        setExito(`🗑️ "${nombre}" eliminado del inventario permanentemente`);
        
        if (filtroFecha) {
          cargarInventarioPorFecha(filtroFecha);
        }
        setLoading(false);
        return;
      }

      // Sin internet
      agregarOperacion({
        tipo: 'DELETE',
        tabla: 'inventario',
        id_registro: id
      });

      const nuevosItems = inventarioActual.filter(item => item.id !== id);
      setInventarioActual(nuevosItems);
      setExito(`📝 "${nombre}" eliminado localmente. Se sincronizará con internet.`);
      setLoading(false);

    } catch (err) {
      console.error('Error eliminando:', err);
      setError('Error al eliminar el producto del inventario: ' + err.message);
      setLoading(false);
    }
  };

// ===== GUARDAR INVENTARIO (CON SOPORTE OFFLINE) =====
const guardarInventario = async () => {
  if (inventarioActual.length === 0) {
    setError('Agrega al menos un producto al inventario');
    return;
  }

  // Si no hay conexión, guardar localmente y en cola
  if (!conectado) {
    try {
      setLoading(true);
      
      // Preparar datos para guardar
      const datosInventario = inventarioActual.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        fecha: fecha
      }));
      
      // Guardar en localStorage como respaldo
      const inventarioKey = `inventario_${fecha}`;
      guardarLocal(inventarioKey, datosInventario);
      
      // Guardar en la cola de operaciones pendientes
      agregarOperacion({
        tipo: 'INSERT',
        tabla: 'inventario',
        datos: datosInventario,
        esInventario: true,
        fecha: fecha
      });

      setExito(`📝 Inventario guardado localmente (${datosInventario.length} productos). Se sincronizará con internet.`);
      setTimeout(() => setExito(null), 4000);
      setLoading(false);
      return;
    } catch (err) {
      console.error('Error guardando inventario offline:', err);
      setError('Error al guardar inventario offline: ' + err.message);
      setLoading(false);
      return;
    }
  }

  // Con conexión - guardar normal
  try {
    setLoading(true);
    setError(null);

    // Separar items temporales de los reales
    const itemsTemporales = inventarioActual.filter(item => 
      typeof item.id === 'string' && item.id.startsWith('temp_')
    );

    const itemsReales = inventarioActual.filter(item => 
      !(typeof item.id === 'string' && item.id.startsWith('temp_'))
    );

    // Si hay items temporales, guardarlos primero en la cola
    if (itemsTemporales.length > 0) {
      const datosTemporales = itemsTemporales.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        fecha: fecha
      }));

      agregarOperacion({
        tipo: 'INSERT',
        tabla: 'inventario',
        datos: datosTemporales,
        esInventario: true,
        fecha: fecha
      });

      setExito(`📝 ${itemsTemporales.length} productos temporales guardados en cola.`);
    }

    // Si hay items reales, guardarlos directamente en Supabase
    if (itemsReales.length > 0) {
      // Eliminar registros existentes para esta fecha
      const { error: deleteError } = await supabase
        .from('inventario')
        .delete()
        .eq('fecha', fecha);

      if (deleteError) throw deleteError;

      const datosReales = itemsReales.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        fecha: fecha
      }));

      const { data, error } = await supabase
        .from('inventario')
        .insert(datosReales)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // Actualizar IDs de items reales
        const itemsActualizados = inventarioActual.map((item) => {
          const realItem = data.find(d => 
            d.producto_id === item.producto_id && 
            d.cantidad === item.cantidad &&
            d.fecha === fecha
          );
          return {
            ...item,
            id: realItem?.id || item.id
          };
        });
        setInventarioActual(itemsActualizados);
        setExito(`✅ ${data.length} productos guardados en Supabase`);
      }
    }

    // Si todo está bien, recargar inventario
    if (filtroFecha) {
      cargarInventarioPorFecha(filtroFecha);
    } else {
      cargarInventarioPorFecha(fecha);
    }

    setTimeout(() => setExito(null), 4000);
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
    setEditandoId(null);
    setEditandoProducto('');
    setEditandoCantidad('');
    setEditandoFecha('');
  };

  // ===== EXPORTAR A PDF =====
  const exportarPDF = async () => {
    if (inventarioActual.length === 0) {
      setError('No hay productos para exportar');
      return;
    }

    try {
      setGenerandoPDF(true);
      const fechaMostrar = filtroFecha || fecha;
      const total = inventarioActual.length;
      const totalCant = inventarioActual.reduce((sum, item) => sum + item.cantidad, 0);
      
      await PDFInventario(inventarioActual, fechaMostrar, total, totalCant);
      setExito(`📄 PDF generado exitosamente`);
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      console.error('Error generando PDF:', err);
      setError('Error al generar el PDF: ' + err.message);
    } finally {
      setGenerandoPDF(false);
    }
  };

  // ===== SINCRONIZAR MANUAL =====
  const sincronizarManual = async () => {
    if (!conectado) {
      setError('Sin internet');
      return;
    }

    try {
      setExito('🔄 Sincronizando...');
      await sincronizarOperaciones();
      await sincronizar();
      
      const ops = obtenerOperacionesPendientes();
      setOperacionesPendientes(ops.length);
      
      setExito(ops.length === 0 ? '✅ Sincronizado' : `⏳ ${ops.length} pendientes`);
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const totalProductos = inventarioActual.length;
  const totalCantidad = inventarioActual.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="inventario-container">
      <Encabezado />

      <div className="inventario-content">
        <div className="inventario-header">
          <div className="inventario-titulo">
            <h1>📦 Gestión de Inventario</h1>
            <p>Control y seguimiento de productos en stock</p>
          </div>
          <div className="header-actions">
            <span className={`status-indicator ${conectado ? 'online' : 'offline'}`}>
              <i className={`fas ${conectado ? 'fa-wifi' : 'fa-wifi-slash'}`}></i>
              {conectado ? ' En línea' : ' Sin conexión'}
            </span>
            {operacionesPendientes > 0 && (
              <span className="pendientes-indicator">
                <i className="fas fa-clock"></i> {operacionesPendientes} pendientes
              </span>
            )}
            <button className="btn-sincronizar" onClick={sincronizarManual} disabled={!conectado}>
              <i className="fas fa-sync"></i> Sincronizar
            </button>
            <button className="btn-pdf" onClick={exportarPDF} disabled={generandoPDF || inventarioActual.length === 0}>
              {generandoPDF ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Generando...
                </>
              ) : (
                <>
                  <i className="fas fa-file-pdf"></i> Exportar PDF
                </>
              )}
            </button>
            <button className="btn-nuevo" onClick={nuevoInventario}>
              <i className="fas fa-plus-circle"></i> Nuevo Inventario
            </button>
          </div>
        </div>

        {errorProductos && (
          <div className="inventario-error">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Error cargando productos: {errorProductos}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {error && (
          <div className="inventario-error">
            <i className="fas fa-exclamation-triangle"></i>
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

        <div className="filtro-fecha-container">
          <div className="filtro-fecha">
            <label>
              <i className="fas fa-calendar-alt"></i>
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
                  setEditandoId(null);
                }}
              >
                <i className="fas fa-times-circle"></i> Limpiar
              </button>
            )}
          </div>

          <div className="fecha-actual">
            <span className="fecha-label">
              <i className="fas fa-calendar-day"></i> Fecha del inventario:
            </span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="fecha-input"
              disabled={filtroFecha !== ''}
            />
          </div>
        </div>

        <div className="agregar-producto-container">
          <div className="agregar-producto-form">
            <div className="form-group">
              <label><i className="fas fa-box"></i> Producto *</label>
              <select
                value={productoSeleccionado}
                onChange={(e) => setProductoSeleccionado(e.target.value)}
                className="form-select"
                disabled={filtroFecha !== '' || loadingProductos}
              >
                <option value="">Seleccionar producto...</option>
                {productosDisponibles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.marca ? `(${p.marca})` : ''}
                  </option>
                ))}
              </select>
              {loadingProductos && (
                <span className="cargando-productos">Cargando productos...</span>
              )}
            </div>

            <div className="form-group">
              <label><i className="fas fa-weight-hanging"></i> Cantidad *</label>
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
                disabled={loading || filtroFecha !== ''}
              >
                <i className="fas fa-plus-circle"></i> Agregar
              </button>
            </div>
          </div>
        </div>

        <div className="inventario-tabla-container">
          <div className="inventario-tabla-header">
            <h3><i className="fas fa-clipboard-list"></i> Inventario Actual</h3>
            <div className="inventario-resumen">
              <span><i className="fas fa-cubes"></i> Productos: <strong>{totalProductos}</strong></span>
              <span><i className="fas fa-weight"></i> Total: <strong>{totalCantidad.toFixed(2)}</strong></span>
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
                    <th>Fecha</th>
                    <th className="acciones-header">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioActual.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="sin-productos">
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
                      <tr key={item.id || index} className="inventario-fila">
                        <td className="numero">{index + 1}</td>
                        <td className="producto-nombre">
                          {editandoId === item.id ? (
                            <select
                              value={editandoProducto}
                              onChange={(e) => setEditandoProducto(e.target.value)}
                              className="form-select"
                              style={{ padding: '4px 8px', fontSize: '13px' }}
                            >
                              <option value="">Seleccionar producto...</option>
                              {productosDisponibles.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} {p.marca ? `(${p.marca})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            item.nombre
                          )}
                        </td>
                        <td className="categoria">
                          <span className="categoria-badge">{item.categoria}</span>
                        </td>
                        <td className="marca">{item.marca}</td>
                        <td className="unidad">
                          <span className="unidad-badge">{item.unidad_medida}</span>
                        </td>
                        <td className="cantidad">
                          {editandoId === item.id ? (
                            <input
                              type="number"
                              value={editandoCantidad}
                              onChange={(e) => setEditandoCantidad(e.target.value)}
                              className="form-input"
                              style={{ width: '80px', padding: '4px 8px', textAlign: 'center' }}
                              step="0.01"
                              min="0"
                              autoFocus
                            />
                          ) : (
                            <strong>{item.cantidad.toFixed(2)}</strong>
                          )}
                        </td>
                        <td className="fecha">
                          {editandoId === item.id ? (
                            <input
                              type="date"
                              value={editandoFecha}
                              onChange={(e) => setEditandoFecha(e.target.value)}
                              className="form-input"
                              style={{ padding: '4px 8px', fontSize: '13px' }}
                            />
                          ) : (
                            item.fecha
                          )}
                        </td>
                        <td className="acciones">
                          {editandoId === item.id ? (
                            <div className="acciones-botones">
                              <button 
                                className="btn-guardar-edicion" 
                                onClick={actualizarRegistro}
                                disabled={loading}
                                title="Guardar cambios"
                              >
                                <i className="fas fa-save"></i>
                                <span>Guardar</span>
                              </button>
                              <button 
                                className="btn-cancelar-edicion" 
                                onClick={cancelarEdicion}
                                title="Cancelar edición"
                              >
                                <i className="fas fa-times"></i>
                                <span>Cancelar</span>
                              </button>
                            </div>
                          ) : (
                            <div className="acciones-botones">
                              <button 
                                className="btn-editar" 
                                onClick={() => iniciarEdicion(item)}
                                title="Editar registro"
                                disabled={filtroFecha !== ''}
                              >
                                <i className="fas fa-edit"></i>
                                <span>Editar</span>
                              </button>
                              <button 
                                className="btn-eliminar" 
                                onClick={() => {
                                  if (typeof item.id === 'string' && item.id.startsWith('temp_')) {
                                    eliminarDelInventario(index);
                                  } else {
                                    eliminarDeBD(item.id, item.nombre);
                                  }
                                }}
                                title="Eliminar del inventario"
                                disabled={filtroFecha !== ''}
                              >
                                <i className="fas fa-trash-alt"></i>
                                <span>Eliminar</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
            <i className="fas fa-undo-alt"></i> Nuevo Inventario
          </button>
        </div>
      </div>

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