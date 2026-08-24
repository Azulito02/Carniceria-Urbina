import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import TablaClientes from '../components/clientes/TablaClientes';
import ModalAgregarCliente from '../components/clientes/ModalAgregarCliente';
import ModalEditarCliente from '../components/clientes/ModalEditarCliente';
import ModalEliminarCliente from '../components/clientes/ModalEliminarCliente';
import './Clientes.css';

function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  
  // Estados para los modales
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  
  // Estados para el buscador
  const [busqueda, setBusqueda] = useState('');

  // ===== CARGAR CLIENTES =====
  const cargarClientes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');

      if (error) {
        console.error('Error cargando clientes:', error);
        setError('Error al cargar clientes: ' + error.message);
        return;
      }

      setClientes(data || []);
      setClientesFiltrados(data || []);
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // ===== FILTRAR CLIENTES =====
  useEffect(() => {
    filtrarClientes();
  }, [busqueda, clientes]);

  const filtrarClientes = () => {
    let filtrados = [...clientes];

    if (busqueda.trim() !== '') {
      const busquedaLower = busqueda.toLowerCase().trim();
      filtrados = filtrados.filter(c => 
        c.nombre.toLowerCase().includes(busquedaLower) ||
        (c.direccion && c.direccion.toLowerCase().includes(busquedaLower))
      );
    }

    setClientesFiltrados(filtrados);
  };

  // ===== RECARGAR LISTA =====
  const recargarLista = async () => {
    await cargarClientes();
  };

  // ===== ABRIR MODALES =====
  const abrirAgregar = () => {
    setModalAgregar(true);
    setError(null);
  };

  const abrirEditar = (cliente) => {
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

  // ===== CREAR CLIENTE =====
  const crearCliente = async (formData) => {
    try {
      setLoading(true);
      setError(null);

      // Validar que el nombre no esté vacío
      if (!formData.nombre || formData.nombre.trim() === '') {
        setError('El nombre del cliente es obligatorio');
        setLoading(false);
        return false;
      }

      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          nombre: formData.nombre.trim(),
          direccion: formData.direccion?.trim() || null
        }])
        .select();

      if (error) {
        console.error('Error creando cliente:', error);
        setError('Error al crear cliente: ' + error.message);
        setLoading(false);
        return false;
      }

      if (data && data.length > 0) {
        // ===== ACTUALIZAR LA LISTA =====
        const nuevosClientes = [...clientes, data[0]];
        setClientes(nuevosClientes);
        setClientesFiltrados(nuevosClientes);
        
        setModalAgregar(false);
        setExito('✅ Cliente creado exitosamente');
        setTimeout(() => setExito(null), 3000);
        
        setLoading(false);
        return true;
      }

      setLoading(false);
      return false;
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al crear cliente');
      setLoading(false);
      return false;
    }
  };

  // ===== ACTUALIZAR CLIENTE =====
  const actualizarCliente = async (id, formData) => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError('Error: ID del cliente no válido');
        setLoading(false);
        return false;
      }

      if (!formData.nombre || formData.nombre.trim() === '') {
        setError('El nombre del cliente es obligatorio');
        setLoading(false);
        return false;
      }

      const { data, error } = await supabase
        .from('clientes')
        .update({
          nombre: formData.nombre.trim(),
          direccion: formData.direccion?.trim() || null
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error actualizando cliente:', error);
        setError('Error al actualizar cliente: ' + error.message);
        setLoading(false);
        return false;
      }

      if (data && data.length > 0) {
        // ===== ACTUALIZAR LA LISTA =====
        const clientesActualizados = clientes.map(c => 
          c.id === id ? data[0] : c
        );
        setClientes(clientesActualizados);
        setClientesFiltrados(clientesActualizados);
        
        setModalEditar(false);
        setClienteSeleccionado(null);
        setExito('✅ Cliente actualizado exitosamente');
        setTimeout(() => setExito(null), 3000);
        
        setLoading(false);
        return true;
      }

      setLoading(false);
      return false;
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al actualizar cliente');
      setLoading(false);
      return false;
    }
  };

  // ===== ELIMINAR CLIENTE =====
  const eliminarCliente = async (id) => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError('Error: ID del cliente no válido');
        setLoading(false);
        return false;
      }

      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando cliente:', error);
        setError('Error al eliminar cliente: ' + error.message);
        setLoading(false);
        return false;
      }

      // ===== ACTUALIZAR LA LISTA =====
      const clientesRestantes = clientes.filter(c => c.id !== id);
      setClientes(clientesRestantes);
      setClientesFiltrados(clientesRestantes);
      
      setModalEliminar(false);
      setClienteSeleccionado(null);
      setExito('🗑️ Cliente eliminado exitosamente');
      setTimeout(() => setExito(null), 3000);
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al eliminar cliente');
      setLoading(false);
      return false;
    }
  };

  // ===== LIMPIAR FILTROS =====
  const limpiarFiltros = () => {
    setBusqueda('');
  };

  const totalClientes = clientesFiltrados.length;

  return (
    <div className="clientes-container">
      <Encabezado />

      <div className="clientes-content">
        {/* Header */}
        <div className="clientes-header">
          <div className="clientes-titulo">
            <h1>👥 Clientes</h1>
            <p>Gestión de clientes de la carnicería</p>
          </div>
          <button className="btn-agregar" onClick={abrirAgregar}>
            <i className="fas fa-plus-circle"></i> Agregar Cliente
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="clientes-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
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

        {/* Buscador */}
        <div className="buscador-container">
          <div className="buscador-fila">
            <div className="buscador-campo">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Buscar cliente por nombre o dirección..."
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
              <strong>{totalClientes}</strong> clientes encontrados
              {clientes.length !== clientesFiltrados.length && 
                ` (de ${clientes.length} totales)`
              }
            </span>
          </div>
        </div>

        {/* Tabla de clientes */}
        <TablaClientes
          clientes={clientesFiltrados}
          loading={loading}
          onEditar={abrirEditar}
          onEliminar={abrirEliminar}
        />
      </div>

      {/* ===== MODAL AGREGAR ===== */}
      <ModalAgregarCliente
        isOpen={modalAgregar}
        onClose={cerrarModales}
        onSave={crearCliente}
        loading={loading}
      />

      {/* ===== MODAL EDITAR ===== */}
      <ModalEditarCliente
        isOpen={modalEditar}
        onClose={cerrarModales}
        onSave={actualizarCliente}
        cliente={clienteSeleccionado}
        loading={loading}
      />

      {/* ===== MODAL ELIMINAR ===== */}
      <ModalEliminarCliente
        isOpen={modalEliminar}
        onClose={cerrarModales}
        onConfirm={eliminarCliente}
        cliente={clienteSeleccionado}
        loading={loading}
      />

      {/* Navegación inferior */}
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