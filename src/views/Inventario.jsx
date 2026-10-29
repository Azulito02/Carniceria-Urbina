import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import PDFInventario from '../components/PDFInventario';

// 🔥 IMPORTAMOS EL SERVICIO OFFLINE
import { agregarOperacion, sincronizarOperaciones, obtenerOperacionesPendientes } from '../services/OfflineService';
import { estaBajoStock, mensajeStockBajo } from '../utils/alertasStock';

import ModalAgregarInventario from '../components/inventario/ModalAgregarInventario';
import ModalEditarInventario from '../components/inventario/ModalEditarInventario';
import ModalEliminarInventario from '../components/inventario/ModalEliminarInventario';
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
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [alertaStock, setAlertaStock] = useState(null);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);
  const [mostrarInventarioCompleto, setMostrarInventarioCompleto] = useState(false);

  // Estados para modales
  const [modalAgregarOpen, setModalAgregarOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // ===== CARGA INICIAL =====
  useEffect(() => {
    cargarInventarioCompleto();
  }, []);

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

  // ===== REAL TIME: escuchamos inventario, ventas, facturados e inversiones =====
  useEffect(() => {
    if (!conectado) return;

    const subscription = supabase
      .channel('stock_cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, () => recargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => recargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facturados' }, () => recargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inversiones' }, () => recargar())
      .subscribe();

    return () => subscription.unsubscribe();
  }, [conectado, filtroFecha, fecha, mostrarInventarioCompleto]);

  // ===== ESCUCHAMOS EL EVENTO GLOBAL DE STOCK =====
  useEffect(() => {
    const actualizar = () => recargar();
    window.addEventListener('stock-actualizado', actualizar);
    return () => window.removeEventListener('stock-actualizado', actualizar);
  }, [filtroFecha, fecha, mostrarInventarioCompleto]);

  const recargar = () => {
    if (mostrarInventarioCompleto) {
      cargarInventarioCompleto();
    } else if (filtroFecha) {
      cargarInventarioPorFecha(filtroFecha);
    } else {
      cargarInventarioPorFecha(fecha);
    }
  };

  const avisarSiStockBajo = (producto, cantidad) => {
    if (producto && estaBajoStock(cantidad, producto.stock_minimo)) {
      setAlertaStock(mensajeStockBajo(producto.nombre, cantidad, producto.unidad_medida));
      setTimeout(() => setAlertaStock(null), 8000);
    }
  };

  // ===== CARGAR INVENTARIO DESDE stock_actual =====
  const cargarInventarioPorFecha = async (fechaSel) => {
    try {
      setCargandoInventario(true);
      setError(null);
      setExito(null);
      setMostrarInventarioCompleto(false);

      if (!navigator.onLine) {
        // Si estamos offline, no podemos consultar la vista stock_actual. 
        // Podríamos mostrar un mensaje o intentar leer de un caché local si lo tuviéramos.
        setExito('📡 Sin conexión. Mostrando datos locales.');
        setCargandoInventario(false);
        return;
      }

      const { data, error } = await supabase
        .from('stock_actual')
        .select(`
          producto_id,
          nombre,
          unidad_medida,
          stock_minimo,
          cantidad_inventario,
          fecha_inventario,
          stock_disponible
        `)
        .order('nombre');

      if (error) throw error;

      const todos = (data || []).map(item => ({
        id: item.producto_id,
        producto_id: item.producto_id,
        nombre: item.nombre,
        categoria: '-',
        marca: '-',
        unidad_medida: item.unidad_medida || '-',
        stock_minimo: item.stock_minimo ?? 5,
        cantidad: parseFloat(item.stock_disponible) || 0,
        cantidad_conteo: parseFloat(item.cantidad_inventario) || 0,
        fecha: item.fecha_inventario ? new Date(item.fecha_inventario).toISOString().split('T')[0] : '-'
      }));

      const filtrados = fechaSel ? todos.filter(t => t.fecha === fechaSel) : todos;

      setInventarioActual(filtrados);
      if (filtrados.length > 0) {
        setExito(`📋 Inventario cargado - ${filtrados.length} producto(s)`);
        setTimeout(() => setExito(null), 3000);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error al cargar el inventario: ' + err.message);
    } finally {
      setCargandoInventario(false);
    }
  };

  const cargarInventarioCompleto = async () => {
    try {
      setCargandoInventario(true);
      setError(null);
      setExito(null);
      setFiltroFecha('');

      if (!navigator.onLine) {
        setExito('📡 Sin conexión. No se puede cargar el inventario completo.');
        setCargandoInventario(false);
        return;
      }

      const { data, error } = await supabase
        .from('stock_actual')
        .select(`
          producto_id, nombre, unidad_medida, stock_minimo, cantidad_inventario, fecha_inventario, stock_disponible
        `)
        .order('nombre');

      if (error) throw error;

      if (data && data.length > 0) {
        const items = data.map(item => ({
          id: item.producto_id,
          producto_id: item.producto_id,
          nombre: item.nombre,
          categoria: '-',
          marca: '-',
          unidad_medida: item.unidad_medida || '-',
          stock_minimo: item.stock_minimo ?? 5,
          cantidad: parseFloat(item.stock_disponible) || 0,
          cantidad_conteo: parseFloat(item.cantidad_inventario) || 0,
          fecha: item.fecha_inventario ? new Date(item.fecha_inventario).toISOString().split('T')[0] : '-'
        }));
        setInventarioActual(items);
        setMostrarInventarioCompleto(true);
        setExito(`📋 Inventario completo - ${items.length} productos`);
        setTimeout(() => setExito(null), 4000);
      } else {
        setInventarioActual([]);
        setMostrarInventarioCompleto(true);
        setExito('📋 No hay registros de inventario');
        setTimeout(() => setExito(null), 4000);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error al cargar el inventario completo: ' + err.message);
    } finally {
      setCargandoInventario(false);
    }
  };

  // ===== AGREGAR PRODUCTO (OFFLINE / ONLINE) =====
  const agregarAlInventario = async (productoId, cantidad, fechaSeleccionada) => {
    try {
      setLoading(true);
      setError(null);

      const producto = productos?.find(p => p.id === parseInt(productoId));
      if (!producto) {
        setError('Producto no encontrado');
        setTimeout(() => setError(null), 4000);
        setLoading(false);
        return false;
      }

      const nuevoConteo = {
        producto_id: parseInt(productoId),
        cantidad: parseFloat(cantidad),
        fecha: fechaSeleccionada
      };

      if (conectado) {
        const { error } = await supabase.from('inventario').insert([nuevoConteo]);
        if (error) throw error;
        await cargarInventarioPorFecha(fechaSeleccionada);
      } else {
        // Guardar en cola offline
        agregarOperacion({
          tipo: 'INSERT',
          tabla: 'inventario',
          datos: nuevoConteo
        });

        // 🔥 ACTUALIZACIÓN OPTIMISTA: Lo mostramos en la tabla de una vez
        const nuevoItemLocal = {
          id: `local_${Date.now()}`,
          producto_id: parseInt(productoId),
          nombre: producto.nombre,
          unidad_medida: producto.unidad_medida || '-',
          stock_minimo: producto.stock_minimo ?? 5,
          cantidad: parseFloat(cantidad), // Asumimos que el stock actual es lo contado
          cantidad_conteo: parseFloat(cantidad),
          fecha: fechaSeleccionada
        };
        setInventarioActual(prev => [...prev, nuevoItemLocal]);
      }

      setExito(conectado ? `✅ "${producto.nombre}" agregado` : `📝 Guardado localmente. Se sincronizará.`);
      setTimeout(() => setExito(null), 4000);
      avisarSiStockBajo(producto, parseFloat(cantidad));

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al agregar: ' + err.message);
      setTimeout(() => setError(null), 4000);
      setLoading(false);
      return false;
    }
  };

  // ===== EDITAR PRODUCTO (OFFLINE / ONLINE) =====
  const editarInventario = async (id, productoId, cantidad, fechaSeleccionada) => {
    try {
      setLoading(true);
      setError(null);

      const producto = productos?.find(p => p.id === parseInt(productoId));
      if (!producto) {
        setError('Producto no encontrado');
        setTimeout(() => setError(null), 4000);
        setLoading(false);
        return false;
      }

      let inventarioId = null;
      if (conectado) {
        const { data: conteos } = await supabase
          .from('inventario')
          .select('id')
          .eq('producto_id', parseInt(productoId))
          .eq('fecha', fechaSeleccionada)
          .order('id', { ascending: false })
          .limit(1);
        
        if (conteos && conteos.length > 0) inventarioId = conteos[0].id;
      }

      if (conectado && inventarioId) {
        const { error } = await supabase.from('inventario').update({ cantidad: parseFloat(cantidad) }).eq('id', inventarioId);
        if (error) throw error;
        await cargarInventarioPorFecha(fechaSeleccionada);
      } else {
        agregarOperacion({
          tipo: 'UPDATE',
          tabla: 'inventario',
          datos: { cantidad: parseFloat(cantidad) },
          id_registro: inventarioId || id
        });

        // 🔥 ACTUALIZACIÓN OPTIMISTA
        setInventarioActual(prev => prev.map(item => 
          (item.id === id || item.producto_id === parseInt(productoId)) 
          ? { ...item, cantidad: parseFloat(cantidad), cantidad_conteo: parseFloat(cantidad) } 
          : item
        ));
      }

      setExito(conectado ? `✅ Registro actualizado` : `📝 Actualizado localmente. Se sincronizará.`);
      setTimeout(() => setExito(null), 4000);
      avisarSiStockBajo(producto, parseFloat(cantidad));

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al editar: ' + err.message);
      setTimeout(() => setError(null), 4000);
      setLoading(false);
      return false;
    }
  };

  // ===== ELIMINAR PRODUCTO (OFFLINE / ONLINE) =====
  const eliminarInventario = async (id, nombre) => {
    try {
      setLoading(true);
      setError(null);

      if (conectado) {
        const { error } = await supabase.from('inventario').delete().eq('id', id);
        if (error) throw error;
        await recargar();
      } else {
        agregarOperacion({
          tipo: 'DELETE',
          tabla: 'inventario',
          id_registro: id
        });

        // 🔥 ACTUALIZACIÓN OPTIMISTA
        setInventarioActual(prev => prev.filter(item => item.id !== id));
      }

      setExito(conectado ? `🗑️ "${nombre}" eliminado` : `📝 Eliminado localmente. Se sincronizará.`);
      setTimeout(() => setExito(null), 4000);

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al eliminar: ' + err.message);
      setTimeout(() => setError(null), 4000);
      setLoading(false);
      return false;
    }
  };

  const eliminarDirecto = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${nombre}" del inventario?`)) return;
    await eliminarInventario(id, nombre);
  };

  // ===== EXPORTAR A PDF =====
  const exportarPDF = async () => {
    if (inventarioActual.length === 0) {
      setError('No hay productos para exportar');
      setTimeout(() => setError(null), 4000);
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
      setTimeout(() => setError(null), 4000);
    } finally {
      setGenerandoPDF(false);
    }
  };

  // ===== SINCRONIZAR MANUAL =====
  const sincronizarManual = async () => {
    if (!conectado) {
      setError('Sin internet');
      setTimeout(() => setError(null), 4000);
      return;
    }

    try {
      setExito('🔄 Sincronizando...');
      await sincronizarOperaciones();
      await sincronizar();

      const ops = obtenerOperacionesPendientes();
      setOperacionesPendientes(ops.length);

      await recargar();

      setExito(ops.length === 0 ? '✅ Sincronizado' : `⏳ ${ops.length} pendientes`);
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      setError('Error: ' + err.message);
      setTimeout(() => setError(null), 4000);
    }
  };

  // ===== MODALES =====
  const abrirModalAgregar = () => setModalAgregarOpen(true);
  const cerrarModalAgregar = () => setModalAgregarOpen(false);

  const abrirModalEditar = (item) => {
    setSelectedItem(item);
    setModalEditarOpen(true);
  };
  const cerrarModalEditar = () => {
    setSelectedItem(null);
    setModalEditarOpen(false);
  };

  const abrirModalEliminar = (item) => {
    setSelectedItem(item);
    setModalEliminarOpen(true);
  };
  const cerrarModalEliminar = () => {
    setSelectedItem(null);
    setModalEliminarOpen(false);
  };

  // ===== CALCULAR TOTALES =====
  const totalRegistros = inventarioActual.length;
  const totalLibras = inventarioActual.filter(item => item.unidad_medida?.toLowerCase() === 'libra').reduce((sum, item) => sum + item.cantidad, 0);
  const totalUnidades = inventarioActual.filter(item => item.unidad_medida?.toLowerCase() === 'unidad').reduce((sum, item) => sum + item.cantidad, 0);

  const itemBajoStock = (item) => !mostrarInventarioCompleto && estaBajoStock(item.cantidad, item.stock_minimo);
  const productosBajoStock = inventarioActual.filter(itemBajoStock);

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
              {generandoPDF ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
            </button>
            <button className="btn-agregar-producto" onClick={abrirModalAgregar}>
              <i className="fas fa-plus-circle"></i> Agregar Producto
            </button>
          </div>
        </div>

        {errorProductos && (
          <div className="inventario-error">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Error cargando productos: {errorProductos}</span>
          </div>
        )}

        {error && (
          <div className="inventario-error">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-close"><i className="fas fa-times"></i></button>
          </div>
        )}

        {exito && (
          <div className="inventario-exito">
            <i className="fas fa-check-circle"></i>
            <span>{exito}</span>
            <button onClick={() => setExito(null)} className="exito-close"><i className="fas fa-times"></i></button>
          </div>
        )}

        {alertaStock && (
          <div className="alerta-stock">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{alertaStock}</span>
            <button onClick={() => setAlertaStock(null)} className="error-close"><i className="fas fa-times"></i></button>
          </div>
        )}

        {productosBajoStock.length > 0 && (
          <div className="alerta-stock">
            <i className="fas fa-box-open"></i>
            <div>
              <strong>{productosBajoStock.length} producto(s) con poco stock:</strong>
              <ul>
                {productosBajoStock.map(p => (
                  <li key={p.id}>{p.nombre}: {p.cantidad.toFixed(2)} {p.unidad_medida} (mínimo {p.stock_minimo})</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="filtro-fecha-container">
          <div className="filtro-fecha">
            <label><i className="fas fa-calendar-alt"></i> Buscar inventario por fecha de conteo:</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => {
                setFiltroFecha(e.target.value);
                setMostrarInventarioCompleto(false);
                if (e.target.value) cargarInventarioPorFecha(e.target.value);
              }}
              className="fecha-input"
            />
            {filtroFecha && (
              <button className="btn-limpiar-fecha" onClick={() => { setFiltroFecha(''); cargarInventarioCompleto(); }}>
                <i className="fas fa-times-circle"></i> Limpiar
              </button>
            )}
          </div>

          <div className="ver-todos-container">
            <button
              className={`btn-ver-todos ${mostrarInventarioCompleto ? 'active' : ''}`}
              onClick={() => {
                if (mostrarInventarioCompleto) {
                  setMostrarInventarioCompleto(false);
                  setInventarioActual([]);
                  setExito(null);
                  setFiltroFecha('');
                } else {
                  cargarInventarioCompleto();
                }
              }}
            >
              <i className="fas fa-list"></i>
              {mostrarInventarioCompleto ? 'Ocultar todo' : 'Ver todo el inventario'}
            </button>
          </div>
        </div>

        <div className="totales-container">
          <div className="total-card">
            <div className="total-icon"><i className="fas fa-cubes"></i></div>
            <div className="total-info">
              <span className="total-label">Total Registros</span>
              <span className="total-value">{totalRegistros}</span>
            </div>
          </div>

          <div className="total-card">
            <div className="total-icon"><i className="fas fa-weight"></i></div>
            <div className="total-info">
              <span className="total-label">Total Libras</span>
              <span className="total-value">{totalLibras.toFixed(2)} <span className="total-unit">lb</span></span>
            </div>
          </div>

          <div className="total-card">
            <div className="total-icon"><i className="fas fa-box"></i></div>
            <div className="total-info">
              <span className="total-label">Total Unidades</span>
              <span className="total-value">{totalUnidades.toFixed(2)} <span className="total-unit">und</span></span>
            </div>
          </div>
        </div>

        <div className="inventario-tabla-container">
          <div className="inventario-tabla-header">
            <h3><i className="fas fa-clipboard-list"></i> Inventario Actual</h3>
            {mostrarInventarioCompleto && (
              <span className="completo-badge"><i className="fas fa-eye"></i> Vista completa</span>
            )}
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
                    <th>Unidad</th>
                    <th>Conteo</th>
                    <th>Stock actual</th>
                    <th>Fecha conteo</th>
                    <th className="acciones-header">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioActual.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="sin-productos">
                        <i className="fas fa-box-open"></i>
                        <p>No hay productos en el inventario</p>
                        <span className="sin-productos-sub">Agrega un conteo con el botón "Agregar Producto"</span>
                      </td>
                    </tr>
                  ) : (
                    inventarioActual.map((item, index) => (
                      <tr key={item.id || index} className={`inventario-fila ${itemBajoStock(item) ? 'fila-stock-bajo' : ''}`}>
                        <td className="numero">{index + 1}</td>
                        <td className="producto-nombre">{item.nombre}</td>
                        <td className="unidad"><span className="unidad-badge">{item.unidad_medida}</span></td>
                        <td className="cantidad-conteo">{item.cantidad_conteo?.toFixed(2) || '0.00'}</td>
                        <td className="cantidad">
                          <strong>{item.cantidad.toFixed(2)}</strong>
                          {itemBajoStock(item) && <span className="badge-stock-bajo">Poco stock</span>}
                        </td>
                        <td className="fecha">{item.fecha}</td>
                        <td className="acciones">
                          <div className="acciones-botones">
                            <button className="btn-editar" onClick={() => abrirModalEditar(item)} title="Editar conteo">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn-eliminar" onClick={() => abrirModalEliminar(item)} title="Eliminar conteo">
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ModalAgregarInventario isOpen={modalAgregarOpen} onClose={cerrarModalAgregar} onAgregar={agregarAlInventario} productos={productos} fecha={fecha} loading={loading} />
      <ModalEditarInventario isOpen={modalEditarOpen} onClose={cerrarModalEditar} onEditar={editarInventario} item={selectedItem} productos={productos} loading={loading} />
      <ModalEliminarInventario isOpen={modalEliminarOpen} onClose={cerrarModalEliminar} onEliminar={eliminarInventario} item={selectedItem} loading={loading} />
    </div>
  );
}

export default Inventario;