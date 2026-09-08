import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import TablaAbonos from '../components/abonos/TablaAbonos';
import ModalAgregarAbono from '../components/abonos/ModalAgregarAbono';
import ModalEditarAbono from '../components/abonos/ModalEditarAbono';
import ModalEliminarAbono from '../components/abonos/ModalEliminarAbono';
import { agregarOperacion, sincronizarOperaciones, obtenerOperacionesPendientes } from '../services/OfflineService';
import './Abonos.css';

function Abonos() {
  const navigate = useNavigate();

  // ===== ESTADO PRINCIPAL PARA ABONOS =====
  const [abonos, setAbonos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // ===== ESTADO PARA CRÉDITOS =====
  const [creditos, setCreditos] = useState([]);
  const [loadingCreditos, setLoadingCreditos] = useState(false);

  // ===== ESTADOS LOCALES =====
  const [abonosFiltrados, setAbonosFiltrados] = useState([]);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [abonoSeleccionado, setAbonoSeleccionado] = useState(null);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [conectado, setConectado] = useState(navigator.onLine);

  // ===== FUNCIÓN PARA CARGAR ABONOS CON RELACIÓN CLIENTE =====
  const cargarAbonos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('abonos_credito')
        .select(`
          *,
          credito:credito_id (
            id,
            cliente:cliente_id (nombre),
            monto_total,
            saldo_pendiente
          )
        `)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setAbonos(data || []);
      setSyncError(null);
    } catch (err) {
      console.error('Error cargando abonos:', err);
      setSyncError('Error al cargar los abonos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== CARGAR CRÉDITOS ACTIVOS CON SALDO PENDIENTE > 0 =====
  const cargarCreditos = async () => {
    setLoadingCreditos(true);
    try {
      const { data, error } = await supabase
        .from('creditos')
        .select(`
          id,
          cliente_id,
          monto_total,
          monto_pagado,
          saldo_pendiente,
          estado,
          clientes (nombre)
        `)
        .in('estado', ['activo', 'vencido'])
        .gt('saldo_pendiente', 0)
        .order('id', { ascending: false });

      if (error) throw error;
      setCreditos(data || []);
    } catch (err) {
      console.error('Error cargando créditos:', err);
      setError('No se pudieron cargar los créditos');
    } finally {
      setLoadingCreditos(false);
    }
  };

  // ===== EFECTO PARA CARGAR DATOS AL INICIO =====
  useEffect(() => {
    cargarAbonos();
    cargarCreditos();

    // Escuchar cambios de conectividad
    const handleOnline = () => setConectado(true);
    const handleOffline = () => setConectado(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

  // ===== FILTRAR ABONOS =====
  useEffect(() => {
    filtrarAbonos();
  }, [busqueda, abonos]);

  const filtrarAbonos = () => {
    let filtrados = [...abonos];
    if (busqueda.trim() !== '') {
      const lower = busqueda.toLowerCase().trim();
      filtrados = filtrados.filter((a) =>
        a.credito?.cliente?.nombre?.toLowerCase().includes(lower) ||
        a.monto?.toString().includes(lower) ||
        a.metodo_pago?.toLowerCase().includes(lower)
      );
    }
    setAbonosFiltrados(filtrados);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
  };

  // ===== CREAR ABONO =====
  const crearAbono = async (formData) => {
    try {
      // Validaciones
      if (!formData.credito_id) {
        setError('Debes seleccionar un crédito');
        return false;
      }
      if (!formData.monto || parseFloat(formData.monto) <= 0) {
        setError('El monto debe ser mayor a cero');
        return false;
      }
      if (parseFloat(formData.monto) > formData.saldo_pendiente) {
        setError('El monto no puede superar el saldo pendiente');
        return false;
      }
      if (!formData.metodo_pago) {
        setError('Selecciona un método de pago');
        return false;
      }
      if (['tarjeta', 'transferencia', 'mixto'].includes(formData.metodo_pago) && !formData.banco) {
        setError('Debes seleccionar un banco');
        return false;
      }

      const nuevoAbono = {
        credito_id: parseInt(formData.credito_id),
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        banco: formData.banco || null,
        fecha: formData.fecha || new Date().toISOString(),
        observaciones: formData.observaciones?.trim() || null
      };

      if (conectado) {
        const { data, error } = await supabase
          .from('abonos_credito')
          .insert([nuevoAbono])
          .select();

        if (error) {
          console.error('Error:', error);
          setError('Error al crear: ' + error.message);
          return false;
        }

        if (data?.length > 0) {
          setModalAgregar(false);
          setExito('✅ Abono registrado');
          // Recargar listas
          await cargarAbonos();
          await cargarCreditos();
          setTimeout(() => setExito(null), 3000);
          return true;
        }
        return false;
      }

      // Sin internet: guardar localmente
      const idLocal = `local_${Date.now()}`;
      agregarOperacion({
        tipo: 'INSERT',
        tabla: 'abonos_credito',
        datos: nuevoAbono
      });

      setAbonos((prev) => [...prev, { ...nuevoAbono, id: idLocal, _local: true }]);
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

  // ===== ACTUALIZAR ABONO =====
  const actualizarAbono = async (id, formData) => {
    try {
      if (!id) {
        setError('ID inválido');
        return false;
      }
      if (!formData.credito_id) {
        setError('Debes seleccionar un crédito');
        return false;
      }
      if (!formData.monto || parseFloat(formData.monto) <= 0) {
        setError('El monto debe ser mayor a cero');
        return false;
      }
      if (!formData.metodo_pago) {
        setError('Selecciona un método de pago');
        return false;
      }
      if (['tarjeta', 'transferencia', 'mixto'].includes(formData.metodo_pago) && !formData.banco) {
        setError('Debes seleccionar un banco');
        return false;
      }

      const datos = {
        credito_id: parseInt(formData.credito_id),
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        banco: formData.banco || null,
        fecha: formData.fecha || new Date().toISOString(),
        observaciones: formData.observaciones?.trim() || null
      };

      // Si es local
      if (typeof id === 'string' && id.startsWith('local_')) {
        setAbonos((prev) =>
          prev.map((a) => (a.id === id ? { ...a, ...datos } : a))
        );
        setModalEditar(false);
        setAbonoSeleccionado(null);
        setExito('📝 Actualizado localmente');
        setTimeout(() => setExito(null), 3000);
        cargarCreditos();
        return true;
      }

      if (conectado) {
        const { data, error } = await supabase
          .from('abonos_credito')
          .update(datos)
          .eq('id', id)
          .select();

        if (error) {
          setError('Error: ' + error.message);
          return false;
        }

        if (data?.length > 0) {
          setAbonos((prev) => prev.map((a) => (a.id === id ? data[0] : a)));
          setModalEditar(false);
          setAbonoSeleccionado(null);
          setExito('✅ Abono actualizado');
          await cargarCreditos();
          setTimeout(() => setExito(null), 3000);
          return true;
        }
        return false;
      }

      // Sin internet
      agregarOperacion({
        tipo: 'UPDATE',
        tabla: 'abonos_credito',
        datos: datos,
        id_registro: id
      });
      setAbonos((prev) => prev.map((a) => (a.id === id ? { ...a, ...datos } : a)));
      setModalEditar(false);
      setAbonoSeleccionado(null);
      setExito('📝 Actualizado localmente');
      setTimeout(() => setExito(null), 3000);
      cargarCreditos();
      return true;
    } catch (err) {
      console.error('Error:', err);
      setError('Error: ' + err.message);
      return false;
    }
  };

  // ===== ELIMINAR ABONO =====
  const eliminarAbono = async (id) => {
    try {
      if (typeof id === 'string' && id.startsWith('local_')) {
        setAbonos((prev) => prev.filter((a) => a.id !== id));
        setModalEliminar(false);
        setAbonoSeleccionado(null);
        setExito('🗑️ Eliminado localmente');
        cargarCreditos();
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      if (conectado) {
        const { error } = await supabase
          .from('abonos_credito')
          .delete()
          .eq('id', id);

        if (error) {
          setError('Error: ' + error.message);
          return false;
        }

        setAbonos((prev) => prev.filter((a) => a.id !== id));
        setModalEliminar(false);
        setAbonoSeleccionado(null);
        setExito('🗑️ Abono eliminado');
        await cargarCreditos();
        setTimeout(() => setExito(null), 3000);
        return true;
      }

      agregarOperacion({
        tipo: 'DELETE',
        tabla: 'abonos_credito',
        id_registro: id
      });
      setAbonos((prev) => prev.filter((a) => a.id !== id));
      setModalEliminar(false);
      setAbonoSeleccionado(null);
      setExito('📝 Eliminado localmente');
      cargarCreditos();
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
      await cargarAbonos();
      await cargarCreditos();

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

  const abrirEditar = (abono) => {
    if (!abono?.id) {
      setError('Abono no válido');
      return;
    }
    setAbonoSeleccionado(abono);
    setModalEditar(true);
    setError(null);
  };

  const abrirEliminar = (abono) => {
    setAbonoSeleccionado(abono);
    setModalEliminar(true);
    setError(null);
  };

  const cerrarModales = () => {
    setModalAgregar(false);
    setModalEditar(false);
    setModalEliminar(false);
    setAbonoSeleccionado(null);
    setError(null);
  };

  const totalAbonos = abonosFiltrados.length;

  // ===== RENDER =====
  if (loading || loadingCreditos) {
    return (
      <div className="abonos-container">
        <Encabezado />
        <div className="abonos-content">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="abonos-container">
      <Encabezado />

      <div className="abonos-content">
        <div className="abonos-header">
          <div className="abonos-titulo">
            <h1>💰 Abonos a Créditos</h1>
            <p>Registro de pagos de créditos</p>
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
          <div className="abonos-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{syncError || error}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {exito && (
          <div className="abonos-exito">
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
                placeholder="Buscar por cliente, monto o método..."
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
              <strong>{totalAbonos}</strong> abonos
              {abonos.length !== abonosFiltrados.length &&
                ` (de ${abonos.length})`}
            </span>
          </div>
        </div>

        <TablaAbonos
          abonos={abonosFiltrados}
          loading={loading}
          onEditar={abrirEditar}
          onEliminar={abrirEliminar}
        />
      </div>

      {/* ===== MODALES ===== */}
      <ModalAgregarAbono
        isOpen={modalAgregar}
        onClose={cerrarModales}
        onSave={crearAbono}
        creditos={creditos}
        loading={loading}
      />

      <ModalEditarAbono
        isOpen={modalEditar}
        onClose={cerrarModales}
        onSave={actualizarAbono}
        abono={abonoSeleccionado}
        creditos={creditos}
        loading={loading}
      />

      <ModalEliminarAbono
        isOpen={modalEliminar}
        onClose={cerrarModales}
        onConfirm={eliminarAbono}
        abono={abonoSeleccionado}
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
        <button className="nav-item" onClick={() => navigate('/ventas')}>
          <i className="fas fa-cash-register"></i>
          <span>Ventas</span>
        </button>
        <button className="nav-item active" onClick={() => navigate('/abonos')}>
          <i className="fas fa-hand-holding-usd"></i>
          <span>Abonos</span>
        </button>
      </div>
    </div>
  );
}

export default Abonos;

