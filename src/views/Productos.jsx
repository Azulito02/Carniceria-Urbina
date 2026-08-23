import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import TablaProductos from '../components/productos/TablaProductos';
import ModalAgregarProducto from '../components/productos/ModalAgregarProducto';
import ModalEditarProducto from '../components/productos/ModalEditarProducto';
import ModalEliminarProducto from '../components/productos/ModalEliminarProducto';
import './Productos.css';

function Productos() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [error, setError] = useState(null);
  
  // Estados para el buscador
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

  // ===== CARGAR PRODUCTOS =====
  const cargarProductos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre');

      if (error) {
        console.error('Error cargando productos:', error);
        setError('Error al cargar productos: ' + error.message);
        return;
      }

      setProductos(data || []);
      setProductosFiltrados(data || []);
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // ===== FILTRAR PRODUCTOS =====
  useEffect(() => {
    filtrarProductos();
  }, [busqueda, filtroCategoria, filtroMarca, productos]);

  const filtrarProductos = () => {
    let filtrados = [...productos];

    // Filtrar por búsqueda (nombre)
    if (busqueda.trim() !== '') {
      const busquedaLower = busqueda.toLowerCase().trim();
      filtrados = filtrados.filter(p => 
        p.nombre.toLowerCase().includes(busquedaLower)
      );
    }

    // Filtrar por categoría
    if (filtroCategoria !== '') {
      filtrados = filtrados.filter(p => p.categoria === filtroCategoria);
    }

    // Filtrar por marca
    if (filtroMarca !== '') {
      const marcaLower = filtroMarca.toLowerCase().trim();
      filtrados = filtrados.filter(p => 
        p.marca && p.marca.toLowerCase().includes(marcaLower)
      );
    }

    setProductosFiltrados(filtrados);
  };

  // ===== LIMPIAR FILTROS =====
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCategoria('');
    setFiltroMarca('');
  };

  // ===== CREAR PRODUCTO =====
  const crearProducto = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!formData.nombre || formData.nombre.trim() === '') {
        setError('El nombre del producto es obligatorio');
        setLoading(false);
        return false;
      }

      const { data, error } = await supabase
        .from('productos')
        .insert([{
          nombre: formData.nombre.trim(),
          categoria: formData.categoria,
          marca: formData.marca?.trim() || null,
          unidad_medida: formData.unidad_medida,
        }])
        .select();

      if (error) {
        console.error('Error creando producto:', error);
        setError('Error al crear producto: ' + error.message);
        setLoading(false);
        return false;
      }

      if (data && data.length > 0) {
        const nuevosProductos = [...productos, data[0]];
        setProductos(nuevosProductos);
        setProductosFiltrados(nuevosProductos);
        setModalAgregar(false);
        setError(null);
        setLoading(false);
        alert('✅ Producto creado exitosamente');
        return true;
      }

      setLoading(false);
      return false;
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al crear producto');
      setLoading(false);
      return false;
    }
  };

  // ===== ACTUALIZAR PRODUCTO =====
  const actualizarProducto = async (id, formData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!id) {
        alert('Error: ID del producto no válido');
        setLoading(false);
        return false;
      }

      if (!formData.nombre || formData.nombre.trim() === '') {
        alert('El nombre del producto es obligatorio');
        setLoading(false);
        return false;
      }

      const datosActualizar = {
        nombre: formData.nombre.trim(),
        categoria: formData.categoria || 'otros',
        marca: formData.marca?.trim() || null,
        unidad_medida: formData.unidad_medida || 'unidad',
      };

      const { data, error } = await supabase
        .from('productos')
        .update(datosActualizar)
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Error de Supabase:', error);
        alert('Error al actualizar: ' + error.message);
        setLoading(false);
        return false;
      }

      if (data && data.length > 0) {
        const productosActualizados = productos.map(p => p.id === id ? data[0] : p);
        setProductos(productosActualizados);
        setProductosFiltrados(productosActualizados);
        setModalEditar(false);
        setProductoSeleccionado(null);
        setError(null);
        setLoading(false);
        alert('✅ Producto actualizado exitosamente');
        return true;
      }

      setLoading(false);
      return false;
    } catch (err) {
      console.error('❌ Error inesperado:', err);
      alert('Error: ' + err.message);
      setLoading(false);
      return false;
    }
  };

  // ===== ELIMINAR PRODUCTO =====
  const eliminarProducto = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando producto:', error);
        setError('Error al eliminar producto: ' + error.message);
        setLoading(false);
        return false;
      }

      const productosRestantes = productos.filter(p => p.id !== id);
      setProductos(productosRestantes);
      setProductosFiltrados(productosRestantes);
      setModalEliminar(false);
      setProductoSeleccionado(null);
      setError(null);
      setLoading(false);
      alert('✅ Producto eliminado');
      return true;
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al eliminar producto');
      setLoading(false);
      return false;
    }
  };

  // ===== ABRIR MODALES =====
  const abrirAgregar = () => {
    setProductoSeleccionado(null);
    setModalAgregar(true);
    setError(null);
  };

  const abrirEditar = (producto) => {
    if (!producto || !producto.id) {
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

  // Obtener marcas únicas para el filtro
  const marcasUnicas = [...new Set(productos.map(p => p.marca).filter(m => m && m.trim() !== ''))];

  return (
    <div className="productos-container">
      <Encabezado />

      <div className="productos-content">
        <div className="productos-header">
          <div className="productos-titulo">
            <h1>📦 Productos</h1>
            <p>Gestión de productos de la carnicería</p>
          </div>
          <button className="btn-agregar" onClick={abrirAgregar}>
            <i className="fas fa-plus"></i> Agregar Producto
          </button>
        </div>

        {error && (
          <div className="productos-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* ===== BUSCADOR ===== */}
        <div className="buscador-container">
          <div className="buscador-fila">
            <div className="buscador-campo">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Buscar por nombre..."
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
              <strong>{productosFiltrados.length}</strong> productos encontrados
              {productos.length !== productosFiltrados.length && 
                ` (de ${productos.length} totales)`
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

      {/* MODALES */}
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

      {/* NAVEGACIÓN INFERIOR */}
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