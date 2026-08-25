import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import PDFInventario from '../components/PDFInventario';
import { agregarOperacion, sincronizarOperaciones, obtenerOperacionesPendientes } from '../services/OfflineService';
import { guardarLocal, obtenerLocal } from '../utils/storage';
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
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);
  const [mostrarInventarioCompleto, setMostrarInventarioCompleto] = useState(false);
  
  // Estados para modales
  const [modalAgregarOpen, setModalAgregarOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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

  // ===== REAL TIME CON onSnapshot =====
  useEffect(() => {
    if (!conectado) return;

    const subscription = supabase
      .channel('inventario_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventario'
        },
        (payload) => {
          console.log('Cambio en inventario:', payload);
          
          if (filtroFecha) {
            cargarInventarioPorFecha(filtroFecha);
          } else if (fecha && !mostrarInventarioCompleto) {
            cargarInventarioPorFecha(fecha);
          }
          
          const evento = payload.eventType;
          let mensaje = '';
          switch (evento) {
            case 'INSERT':
              mensaje = '📦 Nuevo producto agregado al inventario';
              break;
            case 'UPDATE':
              mensaje = '🔄 Producto actualizado en el inventario';
              break;
            case 'DELETE':
              mensaje = '🗑️ Producto eliminado del inventario';
              break;
            default:
              mensaje = '🔄 Cambios en el inventario';
          }
          setExito(mensaje);
          setTimeout(() => setExito(null), 4000);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conectado, filtroFecha, fecha, mostrarInventarioCompleto]);

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
      setMostrarInventarioCompleto(false);

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
        setTimeout(() => setExito(null), 4000);
      } else {
        setInventarioActual([]);
        setExito(`📅 No hay inventario registrado para el ${fecha}`);
        setTimeout(() => setExito(null), 4000);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al cargar el inventario');
      setInventarioActual([]);
    } finally {
      setCargandoInventario(false);
    }
  };

  // ===== CARGAR INVENTARIO COMPLETO =====
  const cargarInventarioCompleto = async () => {
    try {
      setCargandoInventario(true);
      setError(null);
      setExito(null);
      setFiltroFecha('');

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
        .order('fecha', { ascending: false })
        .order('producto_id');

      if (error) {
        console.error('Error cargando inventario completo:', error);
        setError('Error al cargar el inventario completo: ' + error.message);
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
        setExito(`📋 Mostrando inventario completo - ${items.length} registros encontrados`);
        setTimeout(() => setExito(null), 4000);
      } else {
        setInventarioActual([]);
        setExito('📋 No hay registros de inventario');
        setTimeout(() => setExito(null), 4000);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al cargar el inventario completo');
      setInventarioActual([]);
    } finally {
      setCargandoInventario(false);
    }
  };

  // ===== AGREGAR PRODUCTO DESDE MODAL =====
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

      const existe = inventarioActual.find(
        item => item.producto_id === parseInt(productoId) && item.fecha === fechaSeleccionada
      );

      if (existe) {
        if (conectado) {
          const { error } = await supabase
            .from('inventario')
            .update({ cantidad: parseFloat(cantidad) })
            .eq('id', existe.id);

          if (error) {
            setError('Error al actualizar: ' + error.message);
            setTimeout(() => setError(null), 4000);
            setLoading(false);
            return false;
          }
        } else {
          agregarOperacion({
            tipo: 'UPDATE',
            tabla: 'inventario',
            datos: { cantidad: parseFloat(cantidad) },
            id_registro: existe.id
          });
        }

        const nuevosItems = inventarioActual.map(item =>
          item.id === existe.id
            ? { ...item, cantidad: parseFloat(cantidad) }
            : item
        );
        setInventarioActual(nuevosItems);
        setExito(`✅ Cantidad actualizada para "${producto.nombre}"`);
        setTimeout(() => setExito(null), 4000);
        setLoading(false);
        return true;
      }

      if (conectado) {
        const { data, error } = await supabase
          .from('inventario')
          .insert([{
            producto_id: parseInt(productoId),
            cantidad: parseFloat(cantidad),
            fecha: fechaSeleccionada
          }])
          .select();

        if (error) {
          setError('Error al agregar: ' + error.message);
          setTimeout(() => setError(null), 4000);
          setLoading(false);
          return false;
        }

        if (data && data.length > 0) {
          const nuevoItem = {
            id: data[0].id,
            producto_id: data[0].producto_id,
            nombre: producto.nombre,
            categoria: producto.categoria,
            marca: producto.marca || '-',
            unidad_medida: producto.unidad_medida,
            cantidad: data[0].cantidad,
            fecha: data[0].fecha
          };
          setInventarioActual([...inventarioActual, nuevoItem]);
          setExito(`✅ "${producto.nombre}" agregado al inventario`);
          setTimeout(() => setExito(null), 4000);
        }
      } else {
        const nuevoItem = {
          id: `temp_${Date.now()}`,
          producto_id: parseInt(productoId),
          nombre: producto.nombre,
          categoria: producto.categoria,
          marca: producto.marca || '-',
          unidad_medida: producto.unidad_medida,
          cantidad: parseFloat(cantidad),
          fecha: fechaSeleccionada
        };
        setInventarioActual([...inventarioActual, nuevoItem]);
        setExito(`📝 "${producto.nombre}" agregado localmente. Se sincronizará con internet.`);
        setTimeout(() => setExito(null), 4000);

        agregarOperacion({
          tipo: 'INSERT',
          tabla: 'inventario',
          datos: {
            producto_id: parseInt(productoId),
            cantidad: parseFloat(cantidad),
            fecha: fechaSeleccionada
          }
        });
      }

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error al agregar producto: ' + err.message);
      setTimeout(() => setError(null), 4000);
      setLoading(false);
      return false;
    }
  };

  // ===== ELIMINAR PRODUCTO DESDE MODAL =====
  const eliminarInventario = async (id, nombre) => {
    try {
      setLoading(true);
      setError(null);

      if (typeof id === 'string' && id.startsWith('temp_')) {
        const nuevosItems = inventarioActual.filter(item => item.id !== id);
        setInventarioActual(nuevosItems);
        setExito(`🗑️ "${nombre}" eliminado del inventario`);
        setTimeout(() => setExito(null), 4000);
        setLoading(false);
        return true;
      }

      if (conectado) {
        const { error } = await supabase
          .from('inventario')
          .delete()
          .eq('id', id);

        if (error) {
          setError('Error al eliminar: ' + error.message);
          setTimeout(() => setError(null), 4000);
          setLoading(false);
          return false;
        }
      } else {
        agregarOperacion({
          tipo: 'DELETE',
          tabla: 'inventario',
          id_registro: id
        });
      }

      const nuevosItems = inventarioActual.filter(item => item.id !== id);
      setInventarioActual(nuevosItems);
      setExito(`🗑️ "${nombre}" eliminado del inventario`);
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

  // ===== EDITAR PRODUCTO DESDE MODAL =====
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

      if (conectado) {
        const { error } = await supabase
          .from('inventario')
          .update({
            producto_id: parseInt(productoId),
            cantidad: parseFloat(cantidad),
            fecha: fechaSeleccionada
          })
          .eq('id', id);

        if (error) {
          setError('Error al actualizar: ' + error.message);
          setTimeout(() => setError(null), 4000);
          setLoading(false);
          return false;
        }
      } else {
        agregarOperacion({
          tipo: 'UPDATE',
          tabla: 'inventario',
          datos: {
            producto_id: parseInt(productoId),
            cantidad: parseFloat(cantidad),
            fecha: fechaSeleccionada
          },
          id_registro: id
        });
      }

      const nuevosItems = inventarioActual.map(item =>
        item.id === id
          ? {
              ...item,
              producto_id: parseInt(productoId),
              nombre: producto.nombre,
              categoria: producto.categoria,
              marca: producto.marca || '-',
              unidad_medida: producto.unidad_medida,
              cantidad: parseFloat(cantidad),
              fecha: fechaSeleccionada
            }
          : item
      );
      setInventarioActual(nuevosItems);
      setExito(`✅ Registro actualizado correctamente`);
      setTimeout(() => setExito(null), 4000);
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

  // ===== ELIMINAR PRODUCTO DIRECTAMENTE DESDE LA TABLA =====
  const eliminarDirecto = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${nombre}" del inventario?`)) {
      return;
    }
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
      
      setExito(ops.length === 0 ? '✅ Sincronizado' : `⏳ ${ops.length} pendientes`);
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      setError('Error: ' + err.message);
      setTimeout(() => setError(null), 4000);
    }
  };

  // ===== ABRIR MODALES =====
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
  
  const totalLibras = inventarioActual
    .filter(item => item.unidad_medida && item.unidad_medida.toLowerCase() === 'libra')
    .reduce((sum, item) => sum + item.cantidad, 0);

  const totalUnidades = inventarioActual
    .filter(item => item.unidad_medida && item.unidad_medida.toLowerCase() === 'unidad')
    .reduce((sum, item) => sum + item.cantidad, 0);

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
            <button className="btn-agregar-producto" onClick={abrirModalAgregar}>
              <i className="fas fa-plus-circle"></i> Agregar Producto
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
                setMostrarInventarioCompleto(false);
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
                  setMostrarInventarioCompleto(false);
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
              disabled={filtroFecha !== '' || mostrarInventarioCompleto}
            />
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

        {/* ===== TARJETAS DE TOTALES ===== */}
        <div className="totales-container">
          <div className="total-card">
            <div className="total-icon">
              <i className="fas fa-cubes"></i>
            </div>
            <div className="total-info">
              <span className="total-label">Total Registros</span>
              <span className="total-value">{totalRegistros}</span>
            </div>
          </div>

          <div className="total-card">
            <div className="total-icon">
              <i className="fas fa-weight"></i>
            </div>
            <div className="total-info">
              <span className="total-label">Total Libras</span>
              <span className="total-value">{totalLibras.toFixed(2)} <span className="total-unit">lb</span></span>
            </div>
          </div>

          <div className="total-card">
            <div className="total-icon">
              <i className="fas fa-box"></i>
            </div>
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
              <span className="completo-badge">
                <i className="fas fa-eye"></i> Vista completa
              </span>
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
                            : 'Selecciona una fecha o haz clic en "Ver todo el inventario"'}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    inventarioActual.map((item, index) => (
                      <tr key={item.id || index} className="inventario-fila">
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
                        <td className="fecha">{item.fecha}</td>
                        <td className="acciones">
                          <div className="acciones-botones">
                            <button 
                              className="btn-editar" 
                              onClick={() => abrirModalEditar(item)}
                              title="Editar registro"
                              disabled={filtroFecha !== '' || mostrarInventarioCompleto}
                            >
                              <i className="fas fa-edit"></i>
                              <span>Editar</span>
                            </button>
                            <button 
                              className="btn-eliminar" 
                              onClick={() => {
                                if (typeof item.id === 'string' && item.id.startsWith('temp_')) {
                                  eliminarDirecto(item.id, item.nombre);
                                } else {
                                  abrirModalEliminar(item);
                                }
                              }}
                              title="Eliminar del inventario"
                              disabled={filtroFecha !== '' || mostrarInventarioCompleto}
                            >
                              <i className="fas fa-trash-alt"></i>
                              <span>Eliminar</span>
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

      {/* ===== MODALES ===== */}
      <ModalAgregarInventario
        isOpen={modalAgregarOpen}
        onClose={cerrarModalAgregar}
        onAgregar={agregarAlInventario}
        productos={productos}
        fecha={fecha}
        loading={loading}
      />

      <ModalEditarInventario
        isOpen={modalEditarOpen}
        onClose={cerrarModalEditar}
        onEditar={editarInventario}
        item={selectedItem}
        productos={productos}
        loading={loading}
      />

      <ModalEliminarInventario
        isOpen={modalEliminarOpen}
        onClose={cerrarModalEliminar}
        onEliminar={eliminarInventario}
        item={selectedItem}
        loading={loading}
      />

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