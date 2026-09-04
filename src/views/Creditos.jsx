// src/views/Creditos.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../database/supabase'
import TablaCreditos from '../components/creditos/TablaCreditos'
import ModalAgregarCredito from '../components/creditos/ModalAgregarCredito'
import ModalEditarCredito from '../components/creditos/ModalEditarCredito'
import ModalEliminarCredito from '../components/creditos/ModalEliminarCredito'
import '../views/Creditos.css'

const Creditos = () => {
  const [creditos, setCreditos] = useState([])
  const [creditosFiltrados, setCreditosFiltrados] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [archivando, setArchivando] = useState(false)
  const [filtroMostrar, setFiltroMostrar] = useState('pendientes')
  
  const [showAgregarModal, setShowAgregarModal] = useState(false)
  const [showEditarModal, setShowEditarModal] = useState(false)
  const [showEliminarModal, setShowEliminarModal] = useState(false)
  const [creditoSeleccionado, setCreditoSeleccionado] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (creditos.length > 0 || creditos.length === 0) {
      aplicarFiltro()
    }
  }, [creditos, filtroMostrar])

  const aplicarFiltro = () => {
    let filtrados = []
    
    switch (filtroMostrar) {
      case 'pendientes':
        filtrados = creditos.filter(credito => 
          credito.saldo_pendiente > 0
        )
        break
      case 'completados':
        filtrados = creditos.filter(credito => 
          credito.saldo_pendiente === 0
        )
        break
      case 'todos':
      default:
        filtrados = [...creditos]
        break
    }
    
    setCreditosFiltrados(filtrados)
  }

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // ✅ Cargar clientes - SOLO id y nombre (los campos que existen)
      const { data: clientesData, error: errorClientes } = await supabase
        .from('clientes')
        .select('id, nombre')
        .order('nombre')
      
      if (errorClientes) {
        console.error('❌ Error clientes:', errorClientes)
      } else {
        console.log('✅ Clientes cargados:', clientesData?.length || 0, 'clientes')
        setClientes(clientesData || [])
      }
      
      // ✅ CARGAR CRÉDITOS - SOLO los campos que existen
      const { data: creditosData, error: errorCreditos } = await supabase
        .from('creditos')
        .select(`
          *,
          clientes (id, nombre)
        `)
        .order('fecha_inicio', { ascending: false })
      
      if (errorCreditos) {
        console.error('❌ Error creditos:', errorCreditos)
      } else {
        console.log('✅ Créditos cargados:', creditosData?.length || 0, 'créditos')
        
        const creditosProcesados = (creditosData || []).map(credito => {
          const total = parseFloat(credito.monto_total) || 0
          const pagado = parseFloat(credito.monto_pagado) || 0
          
          let saldo_pendiente = parseFloat(credito.saldo_pendiente)
          if (saldo_pendiente === undefined || saldo_pendiente === null) {
            saldo_pendiente = total - pagado
          }
          
          saldo_pendiente = Math.max(0, saldo_pendiente)
          
          return {
            ...credito,
            cliente_nombre: credito.clientes?.nombre || 'Cliente no disponible',
            total: total,
            monto_total: total,
            monto_pagado: pagado,
            saldo_pendiente: saldo_pendiente,
            completado: saldo_pendiente === 0
          }
        })
        
        setCreditos(creditosProcesados)
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAgregarCredito = () => {
    setShowAgregarModal(true)
  }

  const handleEditarCredito = (credito) => {
    setCreditoSeleccionado(credito)
    setShowEditarModal(true)
  }

  const handleEliminarCredito = (credito) => {
    setCreditoSeleccionado(credito)
    setShowEliminarModal(true)
  }

  const handleCerrarAgregarModal = () => {
    setShowAgregarModal(false)
  }

  const handleCerrarEditarModal = () => {
    setCreditoSeleccionado(null)
    setShowEditarModal(false)
  }

  const handleCerrarEliminarModal = () => {
    setCreditoSeleccionado(null)
    setShowEliminarModal(false)
  }

  const handleCreditoAgregado = () => {
    cargarDatos()
    setShowAgregarModal(false)
  }

  const handleCreditoEditado = () => {
    cargarDatos()
    setShowEditarModal(false)
  }

  const handleCreditoEliminado = () => {
    cargarDatos()
    setShowEliminarModal(false)
  }

  const getEstadoCredito = (credito) => {
    if (credito.estado === 'cancelado') {
      return { texto: 'Cancelado', clase: 'estado-cancelado' }
    }
    
    if (credito.saldo_pendiente === 0) {
      return { texto: 'Pagado', clase: 'estado-completado' }
    }
    
    if (credito.estado === 'vencido') {
      return { texto: 'Vencido', clase: 'estado-vencido' }
    }
    
    if (credito.fecha_fin) {
      const hoy = new Date()
      const fin = new Date(credito.fecha_fin)
      const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
      const finSinHora = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
      const diferenciaMs = finSinHora.getTime() - hoySinHora.getTime()
      const diferenciaDias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24))
      
      if (diferenciaDias < 0) {
        return { texto: 'Vencido', clase: 'estado-vencido' }
      } else if (diferenciaDias === 0) {
        return { texto: 'Vence hoy', clase: 'estado-por-vencer' }
      } else if (diferenciaDias <= 3) {
        return { texto: `Por vencer (${diferenciaDias}d)`, clase: 'estado-por-vencer' }
      }
    }
    
    return { texto: 'Activo', clase: 'estado-activo' }
  }

  const calcularResumen = () => {
    const totalCreditos = creditos.length
    const totalMonto = creditos.reduce((sum, credito) => sum + (credito.monto_total || 0), 0)
    const totalPagado = creditos.reduce((sum, credito) => sum + (credito.monto_pagado || 0), 0)
    
    const creditosPendientes = creditos.filter(credito => credito.saldo_pendiente > 0).length
    const creditosCompletados = creditos.filter(credito => credito.saldo_pendiente === 0).length
    
    const totalSaldoPendiente = creditos.reduce((sum, credito) => 
      sum + (credito.saldo_pendiente || 0), 0)
    
    return {
      totalCreditos,
      totalMonto,
      totalPagado,
      creditosPendientes,
      creditosCompletados,
      totalSaldoPendiente
    }
  }

  const resumen = calcularResumen()

  const handleCambiarFiltro = (nuevoFiltro) => {
    setFiltroMostrar(nuevoFiltro)
  }

  const handleArchivarCompletados = async () => {
    const creditosCompletados = creditos.filter(c => c.saldo_pendiente === 0)
    
    if (creditosCompletados.length === 0) {
      alert('No hay créditos pagados para eliminar')
      return
    }
    
    const confirmar = window.confirm(
      `¿ELIMINAR ${creditosCompletados.length} CRÉDITOS PAGADOS?\n\n` +
      `⚠️ Esta acción es IRREVERSIBLE. ¿Continuar?`
    )
    
    if (!confirmar) return
    
    try {
      setArchivando(true)
      
      const idsCompletados = creditosCompletados.map(c => c.id)
      
      if (idsCompletados.length > 0) {
        const { error: errorEliminar } = await supabase
          .from('creditos')
          .delete()
          .in('id', idsCompletados)
        
        if (errorEliminar) throw errorEliminar
      }
      
      alert(`✅ ${creditosCompletados.length} créditos pagados eliminados`)
      cargarDatos()
      
    } catch (error) {
      console.error('Error eliminando créditos:', error)
      alert(`Error al eliminar créditos: ${error.message}`)
    } finally {
      setArchivando(false)
    }
  }

  return (
    <div className="creditos-container">
      <div className="creditos-header">
        <div className="creditos-titulo-container">
          <h1 className="creditos-titulo">📋 Créditos</h1>
          <p className="creditos-subtitulo">Gestión de créditos a clientes</p>
        </div>
        
        <div className="creditos-botones-header">
          <button
            onClick={handleAgregarCredito}
            className="btn-agregar-credito"
            disabled={loading || archivando}
          >
            <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Crédito
          </button>
        </div>
      </div>

      <div className="filtros-creditos">
        <div className="filtros-botones">
          <button
            className={`filtro-btn ${filtroMostrar === 'pendientes' ? 'active' : ''}`}
            onClick={() => handleCambiarFiltro('pendientes')}
            disabled={loading || archivando}
          >
            <span className="filtro-btn-text">
              Pendientes <span className="filtro-btn-badge">{resumen.creditosPendientes}</span>
            </span>
          </button>
          <button
            className={`filtro-btn ${filtroMostrar === 'completados' ? 'active' : ''}`}
            onClick={() => handleCambiarFiltro('completados')}
            disabled={loading || archivando}
          >
            <span className="filtro-btn-text">
              Pagados <span className="filtro-btn-badge">{resumen.creditosCompletados}</span>
            </span>
          </button>
          <button
            className={`filtro-btn ${filtroMostrar === 'todos' ? 'active' : ''}`}
            onClick={() => handleCambiarFiltro('todos')}
            disabled={loading || archivando}
          >
            <span className="filtro-btn-text">
              Todos <span className="filtro-btn-badge">{resumen.totalCreditos}</span>
            </span>
          </button>
        </div>
        
        {resumen.creditosCompletados > 0 && (
          <button
            onClick={handleArchivarCompletados}
            className="btn-archivar-completados"
            title="Eliminar créditos pagados"
            disabled={loading || archivando}
          >
            {archivando ? (
              <>
                <div className="spinner-small"></div>
                Eliminando...
              </>
            ) : (
              <>
                <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="btn-archivar-text">
                  Eliminar Pagados <span className="btn-archivar-badge">{resumen.creditosCompletados}</span>
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="resumen-creditos-grid">
        <div className="resumen-card credito-card">
          <div className="resumen-card-content">
            <span className="resumen-card-label">TOTAL CRÉDITOS</span>
            <strong className="resumen-card-value">{resumen.totalCreditos}</strong>
            <div className="resumen-card-sub">
              <span className="resumen-sub-pendientes">{resumen.creditosPendientes} pendientes</span>
              <span className="resumen-sub-completados">{resumen.creditosCompletados} pagados</span>
            </div>
          </div>
          <div className="resumen-card-icon">📊</div>
        </div>
        
        <div className="resumen-card monto-card">
          <div className="resumen-card-content">
            <span className="resumen-card-label">MONTO TOTAL</span>
            <strong className="resumen-card-value">
              C${resumen.totalMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="resumen-card-icon">💰</div>
        </div>

        <div className="resumen-card pagado-card">
          <div className="resumen-card-content">
            <span className="resumen-card-label">TOTAL PAGADO</span>
            <strong className="resumen-card-value">
              C${resumen.totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="resumen-card-icon">✅</div>
        </div>
        
        <div className="resumen-card saldo-card">
          <div className="resumen-card-content">
            <span className="resumen-card-label">SALDO PENDIENTE</span>
            <strong className="resumen-card-value saldo-pendiente-total">
              C${resumen.totalSaldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="resumen-card-icon">⏳</div>
        </div>
      </div>

      {/* TABLA DE CRÉDITOS */}
      <TablaCreditos
        creditos={creditosFiltrados}
        loading={loading}
        onEditar={handleEditarCredito}
        onEliminar={handleEliminarCredito}
        getEstadoCredito={getEstadoCredito}
      />

      {/* MODALES */}
      {showAgregarModal && (
        <ModalAgregarCredito
          isOpen={showAgregarModal}
          onClose={handleCerrarAgregarModal}
          onCreditoAgregado={handleCreditoAgregado}
          clientes={clientes}
        />
      )}

      {showEditarModal && creditoSeleccionado && (
        <ModalEditarCredito
          isOpen={showEditarModal}
          onClose={handleCerrarEditarModal}
          onCreditoEditado={handleCreditoEditado}
          credito={creditoSeleccionado}
          clientes={clientes}
        />
      )}

      {showEliminarModal && creditoSeleccionado && (
        <ModalEliminarCredito
          isOpen={showEliminarModal}
          onClose={handleCerrarEliminarModal}
          onCreditoEliminado={handleCreditoEliminado}
          credito={creditoSeleccionado}
        />
      )}
    </div>
  )
}

export default Creditos