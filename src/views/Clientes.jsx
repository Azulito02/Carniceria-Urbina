import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import TablaClientes from '../components/clientes/TablaClientes';
import ModalAgregarCliente from '../components/clientes/ModalAgregarCliente';
import ModalEditarCliente from '../components/clientes/ModalEditarCliente';
import ModalEliminarCliente from '../components/clientes/ModalEliminarCliente';
import { agregarOperacion, sincronizarOperaciones, obtenerOperacionesPendientes } from '../services/OfflineService';
import './Clientes.css';

function Clientes() {
  const navigate = useNavigate();
  
  const { 
    data: clientes, 
    setData: setClientes,
    loading, 
    error: syncError,
    conectado,
    sincronizar
  } = useRealtimeSync('clientes', 'clientes_cache');

  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
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

  // ===== FILTRAR CLIENTES =====
  useEffect(() => {
    filtrarClientes();
  }, [busqueda, clientes]);

  const filtrarClientes = () => {
    let filtrados = [...clientes];
    if (busqueda.trim() !== '') {
      const lower = busqueda.toLowerCase().trim();
      filtrados = filtrados.filter(c => 
        c.nombre?.toLowerCase().includes(lower) ||
        (c.direccion && c.direccion.toLowerCase().includes(lower))
      );
    }
    setClientesFiltrados(filtrados);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
  };

  // ===== CREAR CLIENTE =====
  const crearCliente = async (formData) => {
    try {
      if (!formData.nombre?.trim()) {
        setError('El nombre es obligatorio');
        return false;
      }

      const nuevoCliente = {
        nombre: formData.nombre.trim(),
        direccion: formData.direccion?.trim() || null
      };

      // Verificar si ya existe (en Supabase)
      if (conectado) {
        const { data: existente, error: checkError } = await supabase
          .from('clientes')
          .select('id')
          .eq('nombre', nuevoCliente.nombre)
          .maybeSingle();

        if (checkError) {
          console.error('Error verificando cliente:', checkError);
        }

        if (existente) {
          setError(`El cliente "${nuevoCliente.nombre}" ya existe`);
          return false;
        }
      }

      // Con internet
      if (conectado) {
        const { data, error } = await supabase
          .from('clientes')
          .insert([nuevoCliente])
          .select();

        if (error) {
          console.error('Error:', error);
          setError('Error al crear: ' + error.message);
          return false;
        }

        if (data?.length > 0) {
          setModalAgregar(false);
          setExito('✅ Cliente creado');
          setTimeout(() => setExito(null), 3000);
          return true;
        }
        return false;
      }

      // Sin internet
      const idLocal = `local_${Date.now()}`;
      
      agregarOperacion({
        tipo: 'INSERT',
        tabla: 'clientes',
        datos: nuevoCliente
      });

      setClientes(prev => {
        const existe = prev.some(c => c.nombre?.toLowerCase() === nuevoCliente.nombre.toLowerCase());
        if (existe) {
          console.log('⏭️ Cliente ya existe localmente');
          return prev;
        }
        return [...prev, { ...nuevoCliente, id: idLocal, _local: true }];
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

  // ===== ACTUALIZAR CLIENTE =====
  const actualizarCliente = async (id, formData) => {
    try {
      if (!id || !formData.nombre?.trim()) {
        alert('Datos inválidos');
        return false;
      }

      const datos = {
        nombre: formData.nombre.trim(),
        direccion: formData.direccion?.trim() || null
      };

      // Si es local
      if (typeof id === 'string' && id.startsWith('local_')) {
        setClientes(prev => prev.map(c => 
          c.id === id ? { ...c, ...datos } : c
        ));
        setModalEditar(false);
        setClienteSeleccionado(null);
        setExito('📝 Actualizado localmente');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      if (conectado) {
        const { data, error } = await supabase
          .from('clientes')
          .update(datos)
          .eq('id', id)
          .select();

        if (error) {
          alert('Error: ' + error.message);
          return false;
        }

        if (data?.length > 0) {
          setClientes(prev => prev.map(c => c.id === id ? data[0] : c));
          setModalEditar(false);
          setClienteSeleccionado(null);
          setExito('✅ Actualizado');
          setTimeout(() => setExito(null), 3000);
          return true;
        }
        return false;
      }

      agregarOperacion({
        tipo: 'UPDATE',
        tabla: 'clientes',
        datos: datos,
        id_registro: id
      });
      setClientes(prev => prev.map(c => c.id === id ? { ...c, ...datos } : c));
      setModalEditar(false);
      setClienteSeleccionado(null);
      setExito('📝 Actualizado localmente');
      setTimeout(() => setExito(null), 3000);
      return true;

    } catch (err) {
      console.error('Error:', err);
      alert('Error: ' + err.message);
      return false;
    }
  };

  // ===== ELIMINAR CLIENTE =====
  const eliminarCliente = async (id) => {
    try {
      if (typeof id === 'string' && id.startsWith('local_')) {
        setClientes(prev => prev.filter(c => c.id !== id));
        setModalEliminar(false);
        setClienteSeleccionado(null);
        setExito('🗑️ Eliminado localmente');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      if (conectado) {
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('id', id);

        if (error) {
          setError('Error: ' + error.message);
          return false;
        }

        setClientes(prev => prev.filter(c => c.id !== id));
        setModalEliminar(false);
        setClienteSeleccionado(null);
        setExito('🗑️ Eliminado');
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      agregarOperacion({
        tipo: 'DELETE',
        tabla: 'clientes',
        id_registro: id
      });
      setClientes(prev => prev.filter(c => c.id !== id));
      setModalEliminar(false);
      setClienteSeleccionado(null);
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
    setModalAgregar(true);
    setError(null);
  };

  const abrirEditar = (cliente) => {
    if (!cliente?.id) {
      alert('Error: Cliente no válido');
      return;
    }
    setClienteSeleccionado(cliente);
    setModalEditar(true);
    setError(null);
  };

  const abrirEliminar = (cliente) => {
    setClienteSeleccionado(cliente);
    setModalEliminar(true);
    setError(null);
  };

  const cerrarModales = () => {
    setModalAgregar(false);
    setModalEditar(false);
    setModalEliminar(false);
    setClienteSeleccionado(null);
    setError(null);
  };

  const totalClientes = clientesFiltrados.length;

  if (loading) {
    return (
      <div className="clientes-container">
        <Encabezado />
        <div className="clientes-content">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="clientes-container">
      <Encabezado />

      <div className="clientes-content">
        <div className="clientes-header">
          <div className="clientes-titulo">
            <h1>👥 Clientes</h1>
            <p>Gestión de clientes de la carnicería</p>
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
          <div className="clientes-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{syncError || error}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {exito && (
          <div className="clientes-exito">
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
                placeholder="Buscar cliente..."
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
              <strong>{totalClientes}</strong> clientes
              {clientes.length !== clientesFiltrados.length && 
                ` (de ${clientes.length})`
              }
            </span>
          </div>
        </div>

        <TablaClientes
          clientes={clientesFiltrados}
          loading={loading}
          onEditar={abrirEditar}
          onEliminar={abrirEliminar}
        />
      </div>

      <ModalAgregarCliente
        isOpen={modalAgregar}
        onClose={cerrarModales}
        onSave={crearCliente}
        loading={loading}
      />

      <ModalEditarCliente
        isOpen={modalEditar}
        onClose={cerrarModales}
        onSave={actualizarCliente}
        cliente={clienteSeleccionado}
        loading={loading}
      />

      <ModalEliminarCliente
        isOpen={modalEliminar}
        onClose={cerrarModales}
        onConfirm={eliminarCliente}
        cliente={clienteSeleccionado}
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
        <button className="nav-item active" onClick={() => navigate('/clientes')}>
          <i className="fas fa-users"></i>
          <span>Clientes</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/ventas')}>
          <i className="fas fa-cash-register"></i>
          <span>Ventas</span>
        </button>
      </div>
    </div>
  );
}

export default Clientes;