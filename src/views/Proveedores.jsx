import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import TablaProveedores from '../components/proveedores/TablaProveedores';
import ModalAgregarProveedor from '../components/proveedores/ModalAgregarProveedor';
import ModalEditarProveedor from '../components/proveedores/ModalEditarProveedor';
import ModalEliminarProveedor from '../components/proveedores/ModalEliminarProveedor';
import './Proveedores.css';

function Proveedores() {
  const navigate = useNavigate();

  const {
    data: proveedores,
    setData: setProveedores,
    loading,
    error: syncError,
    conectado
  } = useRealtimeSync('proveedores', 'proveedores_cache', 'nombre_empresa');

  const [proveedoresFiltrados, setProveedoresFiltrados] = useState([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // ===== CARGAR CATEGORÍAS DESDE PRODUCTOS =====
  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('categoria');

        if (error) throw error;

        const categoriasUnicas = [...new Set(
          (data || [])
            .map(p => p.categoria)
            .filter(c => c && c.trim() !== '')
        )].sort();

        setCategoriasDisponibles(categoriasUnicas);
      } catch (err) {
        console.error('Error cargando categorías:', err);
      }
    };
    cargarCategorias();
  }, []);

  // ===== ETIQUETAS =====
  const etiquetasCategorias = {
    carnes_res: 'Carnes de Res',
    carnes_cerdo: 'Carnes de Cerdo',
    pollo: 'Pollo',
    embutidos: 'Embutidos',
    otros: 'Otros'
  };

  const getEtiquetaCategoria = (cat) => {
    return etiquetasCategorias[cat] || cat;
  };

  // ===== FILTRAR =====
  useEffect(() => {
    let filtrados = [...proveedores];

    if (busqueda.trim() !== '') {
      const lower = busqueda.toLowerCase().trim();
      filtrados = filtrados.filter(p =>
        p.nombre_empresa?.toLowerCase().includes(lower) ||
        p.nombre_vendedor?.toLowerCase().includes(lower)
      );
    }

    if (filtroCategoria !== '') {
      filtrados = filtrados.filter(p =>
        p.categorias && p.categorias.includes(filtroCategoria)
      );
    }

    setProveedoresFiltrados(filtrados);
  }, [busqueda, filtroCategoria, proveedores]);

  // ===== CREAR =====
  const crearProveedor = async (formData) => {
    try {
      setError(null);

      if (!formData.nombre_empresa?.trim()) {
        setError('El nombre de la empresa es obligatorio');
        setTimeout(() => setError(null), 4000);
        return false;
      }

      if (!formData.categorias || formData.categorias.length === 0) {
        setError('Selecciona al menos una categoría');
        setTimeout(() => setError(null), 4000);
        return false;
      }

      const nuevo = {
        nombre_empresa: formData.nombre_empresa.trim(),
        nombre_vendedor: formData.nombre_vendedor?.trim() || null,
        categorias: formData.categorias || []
      };

      if (conectado) {
        const { data, error } = await supabase
          .from('proveedores')
          .insert([nuevo])
          .select();

        if (error) throw error;

        if (data?.length > 0) {
          // Actualizar la lista manualmente (para que aparezca YA)
          setProveedores(prev => [...prev, data[0]]);
          setModalAgregar(false);
          setExito('✅ Proveedor creado');
          setTimeout(() => setExito(null), 3000);
          return true;
        }
        return false;
      }

      // Offline
      const idLocal = `local_${Date.now()}`;
      setProveedores(prev => [...prev, { ...nuevo, id: idLocal, _local: true }]);
      setModalAgregar(false);
      setExito('📝 Guardado localmente');
      setTimeout(() => setExito(null), 4000);
      return true;

    } catch (err) {
      console.error('Error:', err);
      setError('Error al crear proveedor: ' + err.message);
      setTimeout(() => setError(null), 4000);
      return false;
    }
  };

  // ===== ACTUALIZAR =====
  const actualizarProveedor = async (id, formData) => {
    try {
      setError(null);

      if (!id || !formData.nombre_empresa?.trim()) {
        setError('Datos inválidos');
        setTimeout(() => setError(null), 4000);
        return false;
      }

      if (!formData.categorias || formData.categorias.length === 0) {
        setError('Selecciona al menos una categoría');
        setTimeout(() => setError(null), 4000);
        return false;
      }

      const datos = {
        nombre_empresa: formData.nombre_empresa.trim(),
        nombre_vendedor: formData.nombre_vendedor?.trim() || null,
        categorias: formData.categorias || []
      };

      if (typeof id === 'string' && id.startsWith('local_')) {
        setProveedores(prev => prev.map(p =>
          p.id === id ? { ...p, ...datos } : p
        ));
        setModalEditar(false);
        setProveedorSeleccionado(null);
        setExito('📝 Actualizado localmente');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      if (conectado) {
        const { data, error } = await supabase
          .from('proveedores')
          .update(datos)
          .eq('id', id)
          .select();

        if (error) throw error;

        if (data?.length > 0) {
          setProveedores(prev => prev.map(p => p.id === id ? data[0] : p));
          setModalEditar(false);
          setProveedorSeleccionado(null);
          setExito('✅ Proveedor actualizado');
          setTimeout(() => setExito(null), 3000);
          return true;
        }
        return false;
      }

      setProveedores(prev => prev.map(p => p.id === id ? { ...p, ...datos } : p));
      setModalEditar(false);
      setProveedorSeleccionado(null);
      setExito('📝 Actualizado localmente');
      setTimeout(() => setExito(null), 3000);
      return true;

    } catch (err) {
      console.error('Error:', err);
      setError('Error al actualizar: ' + err.message);
      setTimeout(() => setError(null), 4000);
      return false;
    }
  };

  // ===== ELIMINAR =====
  const eliminarProveedor = async (id) => {
    try {
      setError(null);

      if (typeof id === 'string' && id.startsWith('local_')) {
        setProveedores(prev => prev.filter(p => p.id !== id));
        setModalEliminar(false);
        setProveedorSeleccionado(null);
        setExito('🗑️ Eliminado localmente');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      if (conectado) {
        const { error } = await supabase
          .from('proveedores')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setProveedores(prev => prev.filter(p => p.id !== id));
        setModalEliminar(false);
        setProveedorSeleccionado(null);
        setExito('🗑️ Proveedor eliminado');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      setProveedores(prev => prev.filter(p => p.id !== id));
      setModalEliminar(false);
      setProveedorSeleccionado(null);
      setExito('📝 Eliminado localmente');
      setTimeout(() => setExito(null), 3000);
      return true;

    } catch (err) {
      console.error('Error:', err);
      setError('Error al eliminar: ' + err.message);
      setTimeout(() => setError(null), 4000);
      return false;
    }
  };

  const abrirAgregar = () => {
    setProveedorSeleccionado(null);
    setModalAgregar(true);
    setError(null);
  };

  const abrirEditar = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setModalEditar(true);
    setError(null);
  };

  const abrirEliminar = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setModalEliminar(true);
    setError(null);
  };

  const cerrarModales = () => {
    setModalAgregar(false);
    setModalEditar(false);
    setModalEliminar(false);
    setProveedorSeleccionado(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="proveedores-container">
        <Encabezado />
        <div className="proveedores-content">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Cargando proveedores...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="proveedores-container">
      <Encabezado />

      <div className="proveedores-content">
        <div className="proveedores-header">
          <div className="proveedores-titulo">
            <h1>🚚 Proveedores</h1>
            <p>Gestión de proveedores de la carnicería</p>
          </div>
          <div className="header-actions">
            <span className={`status-indicator ${conectado ? 'online' : 'offline'}`}>
              <i className={`fas ${conectado ? 'fa-wifi' : 'fa-wifi-slash'}`}></i>
              {conectado ? ' En línea' : ' Sin conexión'}
            </span>
            <button className="btn-agregar" onClick={abrirAgregar}>
              <i className="fas fa-plus-circle"></i> Agregar Proveedor
            </button>
          </div>
        </div>

        {syncError && (
          <div className="proveedores-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{syncError}</span>
          </div>
        )}

        {error && (
          <div className="proveedores-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {exito && (
          <div className="proveedores-exito">
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
                placeholder="Buscar por empresa o vendedor..."
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
                {categoriasDisponibles.map(cat => (
                  <option key={cat} value={cat}>{getEtiquetaCategoria(cat)}</option>
                ))}
              </select>
            </div>
            {(busqueda || filtroCategoria) && (
              <button
                className="btn-limpiar-filtros"
                onClick={() => { setBusqueda(''); setFiltroCategoria(''); }}
              >
                <i className="fas fa-times"></i> Limpiar
              </button>
            )}
          </div>
          <div className="buscador-resultados">
            <span>
              <strong>{proveedoresFiltrados.length}</strong> proveedores
              {proveedores.length !== proveedoresFiltrados.length &&
                ` (de ${proveedores.length})`
              }
            </span>
          </div>
        </div>

        <TablaProveedores
          proveedores={proveedoresFiltrados}
          loading={loading}
          onEditar={abrirEditar}
          onEliminar={abrirEliminar}
          getEtiquetaCategoria={getEtiquetaCategoria}
        />
      </div>

      <ModalAgregarProveedor
        isOpen={modalAgregar}
        onClose={cerrarModales}
        onSave={crearProveedor}
        categoriasDisponibles={categoriasDisponibles}
        getEtiquetaCategoria={getEtiquetaCategoria}
        loading={loading}
      />

      <ModalEditarProveedor
        isOpen={modalEditar}
        onClose={cerrarModales}
        onSave={actualizarProveedor}
        proveedor={proveedorSeleccionado}
        categoriasDisponibles={categoriasDisponibles}
        getEtiquetaCategoria={getEtiquetaCategoria}
        loading={loading}
      />

      <ModalEliminarProveedor
        isOpen={modalEliminar}
        onClose={cerrarModales}
        onConfirm={eliminarProveedor}
        proveedor={proveedorSeleccionado}
        getEtiquetaCategoria={getEtiquetaCategoria}
        loading={loading}
      />
    </div>
  );
}

export default Proveedores;