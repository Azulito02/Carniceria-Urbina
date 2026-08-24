import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import TablaProductos from '../components/productos/TablaProductos';
import ModalAgregarProducto from '../components/productos/ModalAgregarProducto';
import ModalEditarProducto from '../components/productos/ModalEditarProducto';
import ModalEliminarProducto from '../components/productos/ModalEliminarProducto';
import { agregarOperacion, sincronizarOperaciones, obtenerOperacionesPendientes } from '../services/OfflineService';
import './Productos.css';

function Productos() {
  const navigate = useNavigate();
  
  const { 
    data: productos, 
    setData: setProductos,
    loading, 
    error: syncError,
    conectado,
    sincronizar
  } = useRealtimeSync('productos', 'productos_cache');

  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');

  const categorias = [
    { value: 'carnes_res', label: 'Carnes de Res' },
    { value: 'carnes_cerdo', label: 'Carnes de Cerdo' },
    { value: 'pollo', label: 'Pollo' },
    { value: 'embutidos', label: 'Embutidos' },
    { value: 'otros', label: 'Otros' },
  ];

  const unidades = [
    { value: 'libra', label: 'Libra' },
    { value: 'kilogramo', label: 'Kilogramo' },
    { value: 'unidad', label: 'Unidad' },
  ];

  useEffect(() => {
    const contar = () => {
      const ops = obtenerOperacionesPendientes();
      setOperacionesPendientes(ops.length);
    };
    contar();
    const interval = setInterval(contar, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filtrarProductos();
  }, [busqueda, filtroCategoria, filtroMarca, productos]);

  const filtrarProductos = () => {
    let filtrados = [...productos];
    if (busqueda.trim() !== '') {
      const lower = busqueda.toLowerCase().trim();
      filtrados = filtrados.filter(p => p.nombre?.toLowerCase().includes(lower));
    }
    if (filtroCategoria !== '') {
      filtrados = filtrados.filter(p => p.categoria === filtroCategoria);
    }
    if (filtroMarca !== '') {
      const lower = filtroMarca.toLowerCase().trim();
      filtrados = filtrados.filter(p => p.marca?.toLowerCase().includes(lower));
    }
    setProductosFiltrados(filtrados);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCategoria('');
    setFiltroMarca('');
  };

// ===== CREAR PRODUCTO (CORREGIDO) =====
const crearProducto = async (formData) => {
  try {
    if (!formData.nombre?.trim()) {
      setError('El nombre es obligatorio');
      return false;
    }

    const nuevoProducto = {
      nombre: formData.nombre.trim(),
      categoria: formData.categoria,
      marca: formData.marca?.trim() || null,
      unidad_medida: formData.unidad_medida,
    };

    // Verificar si ya existe un producto con el mismo nombre (en Supabase)
    if (conectado) {
      const { data: existente, error: checkError } = await supabase
        .from('productos')
        .select('id')
        .eq('nombre', nuevoProducto.nombre)
        .maybeSingle();

      if (checkError) {
        console.error('Error verificando producto:', checkError);
      }

      if (existente) {
        setError(`El producto "${nuevoProducto.nombre}" ya existe`);
        return false;
      }
    }

    // Con internet
    if (conectado) {
      const { data, error } = await supabase
        .from('productos')
        .insert([nuevoProducto])
        .select();

      if (error) {
        console.error('Error:', error);
        setError('Error al crear: ' + error.message);
        return false;
      }

      if (data?.length > 0) {
        setModalAgregar(false);
        setExito('✅ Producto creado');
        setTimeout(() => setExito(null), 3000);
        return true;
      }
      return false;
    }

    // Sin internet - guardar en cola + mostrar local
    const idLocal = `local_${Date.now()}`;
    
    agregarOperacion({
      tipo: 'INSERT',
      tabla: 'productos',
      datos: nuevoProducto
    });

    // Solo agregar si no existe ya localmente
    setProductos(prev => {
      const existe = prev.some(p => p.nombre?.toLowerCase() === nuevoProducto.nombre.toLowerCase());
      if (existe) {
        console.log('⏭️ Producto ya existe localmente');
        return prev;
      }
      return [...prev, { ...nuevoProducto, id: idLocal, _local: true }];
    });

    setModalAgregar(false);
    setExito('📝 Guardado localmente. Se sincronizará con internet.');
    setTimeout(() => setExito(null), 4000);
    return true;

  } catch (err) {
    console.error('Error:', err);
    setError('Error inesperado');
    return false;
  }
};

  // ===== ACTUALIZAR PRODUCTO =====
  const actualizarProducto = async (id, formData) => {
    try {
      if (!id || !formData.nombre?.trim()) {
        alert('Datos inválidos');
        return false;
      }

      const datos = {
        nombre: formData.nombre.trim(),
        categoria: formData.categoria || 'otros',
        marca: formData.marca?.trim() || null,
        unidad_medida: formData.unidad_medida || 'unidad',
      };

      // Si es local
      if (typeof id === 'string' && id.startsWith('local_')) {
        setProductos(prev => prev.map(p => 
          p.id === id ? { ...p, ...datos } : p
        ));
        setModalEditar(false);
        setProductoSeleccionado(null);
        setExito('📝 Actualizado localmente');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      if (conectado) {
        const { data, error } = await supabase
          .from('productos')
          .update(datos)
          .eq('id', id)
          .select();

        if (error) {
          alert('Error: ' + error.message);
          return false;
        }

        if (data?.length > 0) {
          setProductos(prev => prev.map(p => p.id === id ? data[0] : p));
          setModalEditar(false);
          setProductoSeleccionado(null);
          setExito('✅ Actualizado');
          setTimeout(() => setExito(null), 3000);
          return true;
        }
        return false;
      }

      agregarOperacion({
        tipo: 'UPDATE',
        tabla: 'productos',
        datos: datos,
        id_registro: id
      });
      setProductos(prev => prev.map(p => p.id === id ? { ...p, ...datos } : p));
      setModalEditar(false);
      setProductoSeleccionado(null);
      setExito('📝 Actualizado localmente');
      setTimeout(() => setExito(null), 3000);
      return true;

    } catch (err) {
      console.error('Error:', err);
      alert('Error: ' + err.message);
      return false;
    }
  };

  // ===== ELIMINAR PRODUCTO =====
  const eliminarProducto = async (id) => {
    try {
      if (typeof id === 'string' && id.startsWith('local_')) {
        setProductos(prev => prev.filter(p => p.id !== id));
        setModalEliminar(false);
        setProductoSeleccionado(null);
        setExito('🗑️ Eliminado localmente');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      if (conectado) {
        const { error } = await supabase
          .from('productos')
          .delete()
          .eq('id', id);

        if (error) {
          setError('Error: ' + error.message);
          return false;
        }

        setProductos(prev => prev.filter(p => p.id !== id));
        setModalEliminar(false);
        setProductoSeleccionado(null);
        setExito('🗑️ Eliminado');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      agregarOperacion({
        tipo: 'DELETE',
        tabla: 'productos',
        id_registro: id
      });
      setProductos(prev => prev.filter(p => p.id !== id));
      setModalEliminar(false);
      setProductoSeleccionado(null);
      setExito('📝 Eliminado localmente');
      setTimeout(() => setExito(null), 3000);
      return true;

    } catch (err) {
      console.error('Error:', err);
      setError('Error inesperado');
      return false;
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

  const abrirAgregar = () => {
    setProductoSeleccionado(null);
    setModalAgregar(true);
    setError(null);
  };

  const abrirEditar = (producto) => {
    if (!producto?.id) {
      alert('Error: Producto no válido');
      return;
    }
    setProductoSeleccionado(producto);
    setModalEditar(true);
    setError(null);
  };

  const abrirEliminar = (producto) => {
    setProductoSeleccionado(producto);
    setModalEliminar(true);
    setError(null);
  };

  const cerrarModales = () => {
    setModalAgregar(false);
    setModalEditar(false);
    setModalEliminar(false);
    setProductoSeleccionado(null);
    setError(null);
  };

  const marcasUnicas = [...new Set(productos.map(p => p.marca).filter(m => m?.trim()))];

  if (loading) {
    return (
      <div className="productos-container">
        <Encabezado />
        <div className="productos-content">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="productos-container">
      <Encabezado />

      <div className="productos-content">
        <div className="productos-header">
          <div className="productos-titulo">
            <h1>📦 Productos</h1>
            <p>Gestión de productos</p>
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
            <button className="btn-agregar" onClick={abrirAgregar}>
              <i className="fas fa-plus"></i> Agregar
            </button>
          </div>
        </div>

        {(syncError || error) && (
          <div className="productos-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{syncError || error}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {exito && (
          <div className="productos-exito">
            <i className="fas fa-check-circle"></i>
            <span>{exito}</span>
            <button onClick={() => setExito(null)} className="exito-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        <div className="buscador-container">
          <div className="buscador-fila">
            <div className="buscador-campo">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="buscador-input"
              />
            </div>
            <div className="buscador-campo">
              <i className="fas fa-tag"></i>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="buscador-select"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="buscador-campo">
              <i className="fas fa-building"></i>
              <select
                value={filtroMarca}
                onChange={(e) => setFiltroMarca(e.target.value)}
                className="buscador-select"
              >
                <option value="">Todas las marcas</option>
                {marcasUnicas.map(marca => (
                  <option key={marca} value={marca}>{marca}</option>
                ))}
              </select>
            </div>
            {(busqueda || filtroCategoria || filtroMarca) && (
              <button className="btn-limpiar-filtros" onClick={limpiarFiltros}>
                <i className="fas fa-times"></i> Limpiar
              </button>
            )}
          </div>
          <div className="buscador-resultados">
            <span>
              <strong>{productosFiltrados.length}</strong> productos
              {productos.length !== productosFiltrados.length && 
                ` (de ${productos.length})`
              }
            </span>
          </div>
        </div>

        <TablaProductos
          productos={productosFiltrados}
          loading={loading}
          onEditar={abrirEditar}
          onEliminar={abrirEliminar}
          categorias={categorias}
          unidades={unidades}
        />
      </div>

      <ModalAgregarProducto
        isOpen={modalAgregar}
        onClose={cerrarModales}
        onSave={crearProducto}
        categorias={categorias}
        unidades={unidades}
        loading={loading}
      />

      <ModalEditarProducto
        isOpen={modalEditar}
        onClose={cerrarModales}
        onSave={actualizarProducto}
        producto={productoSeleccionado}
        categorias={categorias}
        unidades={unidades}
        loading={loading}
      />

      <ModalEliminarProducto
        isOpen={modalEliminar}
        onClose={cerrarModales}
        onConfirm={eliminarProducto}
        producto={productoSeleccionado}
        loading={loading}
      />

      <div className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/')}>
          <i className="fas fa-home"></i>
          <span>Inicio</span>
        </button>
        <button className="nav-item active" onClick={() => navigate('/productos')}>
          <i className="fas fa-box"></i>
          <span>Productos</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/ventas')}>
          <i className="fas fa-cash-register"></i>
          <span>Ventas</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/reportes')}>
          <i className="fas fa-chart-bar"></i>
          <span>Reportes</span>
        </button>
      </div>
    </div>
  );
}

export default Productos;