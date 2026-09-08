import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import TablaGastos from '../components/gastos/Tablagastos';
import ModalAgregarGasto from '../components/gastos/ModalAgregargastos';
import ModalEditarGasto from '../components/gastos/ModalEditargastos';
import ModalEliminarGasto from '../components/gastos/ModalEliminargastos';
import { agregarOperacion, sincronizarOperaciones, obtenerOperacionesPendientes } from '../services/OfflineService';
import './Gastos.css';

function Gastos() {
  const navigate = useNavigate();
  
  // ===== HOOK DE REALTIME =====
 const { 
  data: gastos, 
  setData: setGastos,
  loading, 
  error: syncError,
  conectado,
  sincronizar
} = useRealtimeSync('gastos', 'gastos_cache', { orderBy: 'descripcion' });
  // ===== ESTADOS LOCALES =====
  const [gastosFiltrados, setGastosFiltrados] = useState([]);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);
  const [busqueda, setBusqueda] = useState('');

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

  // ===== FILTRAR GASTOS =====
  useEffect(() => {
    filtrarGastos();
  }, [busqueda, gastos]);

  const filtrarGastos = () => {
    let filtrados = [...gastos];
    if (busqueda.trim() !== '') {
      const lower = busqueda.toLowerCase().trim();
      filtrados = filtrados.filter(g =>
        g.descripcion?.toLowerCase().includes(lower)
      );
    }
    setGastosFiltrados(filtrados);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
  };

  // ===== CREAR GASTO =====
  const crearGasto = async (formData) => {
    try {
      // Validaciones
      if (!formData.descripcion?.trim()) {
        setError('La descripción es obligatoria');
        return false;
      }
      if (!formData.monto || parseFloat(formData.monto) === 0) {
        setError('El monto es obligatorio y no puede ser cero');
        return false;
      }

      const nuevoGasto = {
        descripcion: formData.descripcion.trim(),
        monto: parseFloat(formData.monto)
        // fecha_registro se asigna automáticamente en la BD (DEFAULT now())
      };

      // Con internet
      if (conectado) {
        const { data, error } = await supabase
          .from('gastos')
          .insert([nuevoGasto])
          .select();

        if (error) {
          console.error('Error:', error);
          setError('Error al crear: ' + error.message);
          return false;
        }

        if (data?.length > 0) {
          setModalAgregar(false);
          setExito('✅ Gasto creado');
          setTimeout(() => setExito(null), 3000);
          return true;
        }
        return false;
      }

      // Sin internet: guardar localmente
      const idLocal = `local_${Date.now()}`;
      
      agregarOperacion({
        tipo: 'INSERT',
        tabla: 'gastos',
        datos: nuevoGasto
      });

      setGastos(prev => [...prev, { ...nuevoGasto, id: idLocal, _local: true }]);
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

  // ===== ACTUALIZAR GASTO =====
  const actualizarGasto = async (id, formData) => {
    try {
      if (!id || !formData.descripcion?.trim()) {
        setError('Datos inválidos');
        return false;
      }
      if (!formData.monto || parseFloat(formData.monto) === 0) {
        setError('El monto es obligatorio y no puede ser cero');
        return false;
      }

      const datos = {
        descripcion: formData.descripcion.trim(),
        monto: parseFloat(formData.monto)
        // fecha_registro no se actualiza (se mantiene la original)
      };

      // Si es local
      if (typeof id === 'string' && id.startsWith('local_')) {
        setGastos(prev => prev.map(g =>
          g.id === id ? { ...g, ...datos } : g
        ));
        setModalEditar(false);
        setGastoSeleccionado(null);
        setExito('📝 Actualizado localmente');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      if (conectado) {
        const { data, error } = await supabase
          .from('gastos')
          .update(datos)
          .eq('id', id)
          .select();

        if (error) {
          setError('Error: ' + error.message);
          return false;
        }

        if (data?.length > 0) {
          setGastos(prev => prev.map(g => g.id === id ? data[0] : g));
          setModalEditar(false);
          setGastoSeleccionado(null);
          setExito('✅ Gasto actualizado');
          setTimeout(() => setExito(null), 3000);
          return true;
        }
        return false;
      }

      // Sin internet
      agregarOperacion({
        tipo: 'UPDATE',
        tabla: 'gastos',
        datos: datos,
        id_registro: id
      });
      setGastos(prev => prev.map(g => g.id === id ? { ...g, ...datos } : g));
      setModalEditar(false);
      setGastoSeleccionado(null);
      setExito('📝 Actualizado localmente');
      setTimeout(() => setExito(null), 3000);
      return true;

    } catch (err) {
      console.error('Error:', err);
      setError('Error: ' + err.message);
      return false;
    }
  };

  // ===== ELIMINAR GASTO =====
  const eliminarGasto = async (id) => {
    try {
      if (typeof id === 'string' && id.startsWith('local_')) {
        setGastos(prev => prev.filter(g => g.id !== id));
        setModalEliminar(false);
        setGastoSeleccionado(null);
        setExito('🗑️ Eliminado localmente');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      if (conectado) {
        const { error } = await supabase
          .from('gastos')
          .delete()
          .eq('id', id);

        if (error) {
          setError('Error: ' + error.message);
          return false;
        }

        setGastos(prev => prev.filter(g => g.id !== id));
        setModalEliminar(false);
        setGastoSeleccionado(null);
        setExito('🗑️ Gasto eliminado');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      // Sin internet
      agregarOperacion({
        tipo: 'DELETE',
        tabla: 'gastos',
        id_registro: id
      });
      setGastos(prev => prev.filter(g => g.id !== id));
      setModalEliminar(false);
      setGastoSeleccionado(null);
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

  // ===== ABRIR MODALES =====
  const abrirAgregar = () => {
    setModalAgregar(true);
    setError(null);
  };

  const abrirEditar = (gasto) => {
    if (!gasto?.id) {
      setError('Gasto no válido');
      return;
    }
    setGastoSeleccionado(gasto);
    setModalEditar(true);
    setError(null);
  };

  const abrirEliminar = (gasto) => {
    setGastoSeleccionado(gasto);
    setModalEliminar(true);
    setError(null);
  };

  const cerrarModales = () => {
    setModalAgregar(false);
    setModalEditar(false);
    setModalEliminar(false);
    setGastoSeleccionado(null);
    setError(null);
  };

  const totalGastos = gastosFiltrados.length;

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="gastos-container">
        <Encabezado />
        <div className="gastos-content">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gastos-container">
      <Encabezado />

      <div className="gastos-content">
        <div className="gastos-header">
          <div className="gastos-titulo">
            <h1>💰 Gastos</h1>
            <p>Registro de gastos de la carnicería</p>
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
          <div className="gastos-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{syncError || error}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {exito && (
          <div className="gastos-exito">
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
                placeholder="Buscar por descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="buscador-input"
              />
            </div>
            {busqueda && (
              <button className="btn-limpiar-busqueda" onClick={limpiarFiltros}>
                <i className="fas fa-times-circle"></i> Limpiar
              </button>
            )}
          </div>
          <div className="buscador-resultados">
            <span>
              <strong>{totalGastos}</strong> gastos
              {gastos.length !== gastosFiltrados.length && 
                ` (de ${gastos.length})`
              }
            </span>
          </div>
        </div>

        <TablaGastos
          gastos={gastosFiltrados}
          loading={loading}
          onEditar={abrirEditar}
          onEliminar={abrirEliminar}
        />
      </div>

      {/* ===== MODALES IMPORTADOS ===== */}
      <ModalAgregarGasto
        isOpen={modalAgregar}
        onClose={cerrarModales}
        onSave={crearGasto}
        loading={loading}
      />

      <ModalEditarGasto
        isOpen={modalEditar}
        onClose={cerrarModales}
        onSave={actualizarGasto}
        gasto={gastoSeleccionado}
        loading={loading}
      />

      <ModalEliminarGasto
        isOpen={modalEliminar}
        onClose={cerrarModales}
        onConfirm={eliminarGasto}
        gasto={gastoSeleccionado}
        loading={loading}
      />

      {/* ===== BOTTOM NAV ===== */}
      <div className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/')}>
          <i className="fas fa-home"></i>
          <span>Inicio</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/productos')}>
          <i className="fas fa-box"></i>
          <span>Productos</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/clientes')}>
          <i className="fas fa-users"></i>
          <span>Clientes</span>
        </button>
        <button className="nav-item active" onClick={() => navigate('/gastos')}>
          <i className="fas fa-money-bill-wave"></i>
          <span>Gastos</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/ventas')}>
          <i className="fas fa-cash-register"></i>
          <span>Ventas</span>
        </button>
      </div>
    </div>
  );
}

export default Gastos;