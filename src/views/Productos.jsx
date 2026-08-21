import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import TablaProductos from '../components/Productos/TablaProductos';
import ModalAgregarProducto from '../components/productos/ModalAgregarProducto';
import ModalEditarProducto from '../components/productos/ModalEditarProducto';
import ModalEliminarProducto from '../components/productos/ModalEliminarProducto';
import './Productos.css';

function Productos() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

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
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre');

      if (error) {
        console.error('Error cargando productos:', error);
        alert('Error al cargar productos: ' + error.message);
        return;
      }

      setProductos(data || []);
    } catch (err) {
      console.error('Error inesperado:', err);
      alert('Error inesperado al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // ===== CREAR PRODUCTO =====
  const crearProducto = async (formData) => {
    try {
      setLoading(true);
      
      // Verificar que los datos sean válidos
      if (!formData.nombre || formData.nombre.trim() === '') {
        alert('El nombre del producto es obligatorio');
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
          codigo_barras: formData.codigo_barras?.trim() || null,
        }])
        .select();

      if (error) {
        console.error('Error creando producto:', error);
        alert('Error al crear producto: ' + error.message);
        setLoading(false);
        return false;
      }

      if (data && data.length > 0) {
        setProductos([...productos, data[0]]);
        setModalAgregar(false);
        alert('✅ Producto creado exitosamente');
        setLoading(false);
        return true;
      }

      setLoading(false);
      return false;
    } catch (err) {
      console.error('Error inesperado:', err);
      alert('Error inesperado al crear producto');
      setLoading(false);
      return false;
    }
  };

  // ===== ACTUALIZAR PRODUCTO =====
  const actualizarProducto = async (id, formData) => {
    try {
      setLoading(true);

      if (!formData.nombre || formData.nombre.trim() === '') {
        alert('El nombre del producto es obligatorio');
        setLoading(false);
        return false;
      }

      const { data, error } = await supabase
        .from('productos')
        .update({
          nombre: formData.nombre.trim(),
          categoria: formData.categoria,
          marca: formData.marca?.trim() || null,
          unidad_medida: formData.unidad_medida,
          codigo_barras: formData.codigo_barras?.trim() || null,
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error actualizando producto:', error);
        alert('Error al actualizar producto: ' + error.message);
        setLoading(false);
        return false;
      }

      if (data && data.length > 0) {
        setProductos(productos.map(p => p.id === id ? data[0] : p));
        setModalEditar(false);
        setProductoSeleccionado(null);
        alert('✅ Producto actualizado exitosamente');
        setLoading(false);
        return true;
      }

      setLoading(false);
      return false;
    } catch (err) {
      console.error('Error inesperado:', err);
      alert('Error inesperado al actualizar producto');
      setLoading(false);
      return false;
    }
  };

  // ===== ELIMINAR PRODUCTO =====
  const eliminarProducto = async (id) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando producto:', error);
        alert('Error al eliminar producto: ' + error.message);
        setLoading(false);
        return false;
      }

      setProductos(productos.filter(p => p.id !== id));
      setModalEliminar(false);
      setProductoSeleccionado(null);
      alert('✅ Producto eliminado');
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error inesperado:', err);
      alert('Error inesperado al eliminar producto');
      setLoading(false);
      return false;
    }
  };

  // ===== ABRIR MODALES =====
  const abrirAgregar = () => {
    setProductoSeleccionado(null);
    setModalAgregar(true);
  };

  const abrirEditar = (producto) => {
    setProductoSeleccionado(producto);
    setModalEditar(true);
  };

  const abrirEliminar = (producto) => {
    setProductoSeleccionado(producto);
    setModalEliminar(true);
  };

  const cerrarModales = () => {
    setModalAgregar(false);
    setModalEditar(false);
    setModalEliminar(false);
    setProductoSeleccionado(null);
  };

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

        <TablaProductos
          productos={productos}
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
          <i className="fas fa-home"></i><span>Inicio</span>
        </button>
        <button className="nav-item active" onClick={() => navigate('/productos')}>
          <i className="fas fa-box"></i><span>Productos</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/ventas')}>
          <i className="fas fa-cash-register"></i><span>Ventas</span>
        </button>
        <button className="nav-item">
          <i className="fas fa-ellipsis-h"></i><span>Más</span>
        </button>
      </div>
    </div>
  );
}

export default Productos;