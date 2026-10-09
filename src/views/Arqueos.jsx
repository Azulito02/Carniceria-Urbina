import { useState, useEffect } from 'react'
import { supabase } from '../database/supabase'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import './Arqueos.css'
import Encabezado from '../components/Encabezado'
import ArqueoHeader from '../components/arqueos/ArqueoHeader'
import ArqueoEstadisticas from '../components/arqueos/ArqueoEstadisticas'
import ArqueoTablaDesktop from '../components/arqueos/ArqueoTablaDesktop'
import ArqueoCardMobile from '../components/arqueos/ArqueoCardMobile'
import ArqueoResumenMobile from '../components/arqueos/ArqueoResumenMobile'
import ArqueoModal from '../components/arqueos/ArqueoModal'

import { formatFechaNicaragua } from '../components/arqueos/utils'

const USUARIO_KEY = 'usuarioArelyz'
const NOMBRE_NEGOCIO = 'Arelyz Salón'

const Arqueos = () => {
  const [arqueos, setArqueos] = useState([])
  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [resumenTurno, setResumenTurno] = useState(null)
  const [efectivoContado, setEfectivoContado] = useState('')
  const [ultimoArqueo, setUltimoArqueo] = useState(null)
  const [exportando, setExportando] = useState({})
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => { cargarArqueos() }, [])

  const cargarArqueos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('arqueos').select('*')
        .order('fecha', { ascending: false })
        .limit(20)
      if (error) throw error
      setArqueos(data || [])
      if (data && data.length > 0) setUltimoArqueo(data[0])
    } catch (error) {
      console.error('Error cargando arqueos:', error)
      alert('Error al cargar arqueos')
    } finally {
      setLoading(false)
    }
  }

  // ---------- calcular resumen del turno ----------
  const calcularResumenTurno = async () => {
    try {
      setCalculando(true)

      const fechaDesde = new Date()
      fechaDesde.setHours(0, 0, 0, 0)
      const fechaHasta = new Date()

      const [ventasResp, creditosResp, abonosResp, gastosResp] = await Promise.all([
        supabase.from('ventas').select('*').gte('fecha', fechaDesde.toISOString()),
        supabase.from('creditos').select('*')
          .gte('fecha_inicio', fechaDesde.toISOString())
          .is('procesado_en_arqueo', false)
          .neq('estado', 'cancelado'),
        supabase.from('abonos_credito').select('*')
          .gte('fecha', fechaDesde.toISOString())
          .is('procesado_en_arqueo', false),
        supabase.from('gastos').select('*')
          .gte('fecha_registro', fechaDesde.toISOString())
      ])

      const ventas = ventasResp.data || []
      const creditos = creditosResp.data || []
      const abonos = abonosResp.data || []
      const gastos = gastosResp.data || []

      // --- Ventas por método ---
      let totalVentasEfectivo = 0, totalVentasTarjeta = 0, totalVentasTransferencia = 0
      let cantidadVentasEfectivo = 0, cantidadVentasTarjeta = 0, cantidadVentasTransferencia = 0

      ventas.forEach((venta) => {
        const metodo = venta.metodo_pago?.toLowerCase() || ''
        if (metodo === 'efectivo') {
          totalVentasEfectivo += parseFloat(venta.total) || 0
          cantidadVentasEfectivo++
        } else if (metodo === 'tarjeta') {
          totalVentasTarjeta += parseFloat(venta.total) || 0
          cantidadVentasTarjeta++
        } else if (metodo === 'transferencia') {
          totalVentasTransferencia += parseFloat(venta.total) || 0
          cantidadVentasTransferencia++
        } else if (metodo === 'mixto') {
          const e = parseFloat(venta.efectivo) || 0
          const t = parseFloat(venta.tarjeta) || 0
          const tr = parseFloat(venta.transferencia) || 0
          totalVentasEfectivo += e
          totalVentasTarjeta += t
          totalVentasTransferencia += tr
          if (e > 0) cantidadVentasEfectivo++
          if (t > 0) cantidadVentasTarjeta++
          if (tr > 0) cantidadVentasTransferencia++
        }
      })

      // --- Abonos por método ---
      let abonosEfectivo = 0, abonosTarjeta = 0, abonosTransferencia = 0
      let cantidadAbonosEfectivo = 0, cantidadAbonosTarjeta = 0, cantidadAbonosTransferencia = 0

      abonos.forEach((abono) => {
        const metodo = abono.metodo_pago?.toLowerCase() || ''
        if (metodo === 'efectivo') {
          abonosEfectivo += parseFloat(abono.monto) || 0
          cantidadAbonosEfectivo++
        } else if (metodo === 'tarjeta') {
          abonosTarjeta += parseFloat(abono.monto) || 0
          cantidadAbonosTarjeta++
        } else if (metodo === 'transferencia') {
          abonosTransferencia += parseFloat(abono.monto) || 0
          cantidadAbonosTransferencia++
        } else if (metodo === 'mixto') {
          const e = parseFloat(abono.efectivo) || 0
          const t = parseFloat(abono.tarjeta) || 0
          const tr = parseFloat(abono.transferencia) || 0
          abonosEfectivo += e
          abonosTarjeta += t
          abonosTransferencia += tr
          if (e > 0) cantidadAbonosEfectivo++
          if (t > 0) cantidadAbonosTarjeta++
          if (tr > 0) cantidadAbonosTransferencia++
        }
      })

      // ✅ FIX: creditos usa monto_total
      const totalCreditos = creditos.reduce((s, c) => s + (parseFloat(c.monto_total) || 0), 0)
      const totalGastos = gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0)

      const resumen = {
        totalVentasEfectivo, totalVentasTarjeta, totalVentasTransferencia,
        totalAbonosEfectivo: abonosEfectivo, abonosTarjeta, abonosTransferencia,
        totalCreditos, totalGastos,
        efectivoNeto: totalVentasEfectivo + abonosEfectivo - totalGastos,
        totalEfectivo: totalVentasEfectivo + abonosEfectivo,
        cantidadVentas: ventas.length,
        cantidadVentasEfectivo, cantidadVentasTarjeta, cantidadVentasTransferencia,
        cantidadCreditos: creditos.length,
        cantidadAbonosEfectivo, cantidadAbonosTarjeta, cantidadAbonosTransferencia,
        cantidadGastos: gastos.length,
        fechaDesde: fechaDesde.toLocaleString('es-MX'),
        fechaHasta: fechaHasta.toLocaleString('es-MX'),
        totalVentasGeneral: totalVentasEfectivo + totalVentasTarjeta + totalVentasTransferencia,
        totalAbonosGeneral: abonosEfectivo + abonosTarjeta + abonosTransferencia
      }

      setResumenTurno(resumen)
      setEfectivoContado((totalVentasEfectivo + abonosEfectivo - totalGastos).toFixed(2))
      setModalAbierto(true)
    } catch (error) {
      console.error('Error calculando resumen:', error)
      alert('Error al calcular resumen del turno')
    } finally {
      setCalculando(false)
    }
  }

  const abrirModal = async () => { await calcularResumenTurno() }

  const cerrarModal = () => {
    setModalAbierto(false)
    setResumenTurno(null)
    setEfectivoContado('')
  }

  // ---------- confirmar arqueo ----------
  const realizarArqueo = async () => {
    if (!efectivoContado || parseFloat(efectivoContado) < 0) {
      alert('Ingresa un monto válido para el efectivo contado')
      return
    }

    const usuario = JSON.parse(localStorage.getItem(USUARIO_KEY))?.nombre || 'Sistema'
    const efectivo = parseFloat(efectivoContado)

    const mensaje =
      `¿CONFIRMAR ARQUEO DE TURNO?\n\n` +
      `• Ventas en efectivo: C$${resumenTurno?.totalVentasEfectivo.toFixed(2)} (${resumenTurno?.cantidadVentasEfectivo} ventas)\n` +
      `• Ventas con tarjeta: C$${resumenTurno?.totalVentasTarjeta.toFixed(2)} (${resumenTurno?.cantidadVentasTarjeta} ventas)\n` +
      `• Ventas con transferencia: C$${resumenTurno?.totalVentasTransferencia.toFixed(2)} (${resumenTurno?.cantidadVentasTransferencia} ventas)\n` +
      `• Abonos en efectivo: C$${resumenTurno?.totalAbonosEfectivo.toFixed(2)} (${resumenTurno?.cantidadAbonosEfectivo} abonos)\n` +
      `• Abonos con tarjeta: C$${resumenTurno?.abonosTarjeta.toFixed(2)} (${resumenTurno?.cantidadAbonosTarjeta} abonos)\n` +
      `• Abonos con transferencia: C$${resumenTurno?.abonosTransferencia.toFixed(2)} (${resumenTurno?.cantidadAbonosTransferencia} abonos)\n` +
      `• Gastos: C$${resumenTurno?.totalGastos.toFixed(2)} (${resumenTurno?.cantidadGastos} gastos)\n` +
      `• Créditos: C$${resumenTurno?.totalCreditos.toFixed(2)} (${resumenTurno?.cantidadCreditos} créditos)\n` +
      `• Efectivo neto esperado: C$${resumenTurno?.efectivoNeto.toFixed(2)}\n` +
      `• Efectivo contado: C$${efectivo.toFixed(2)}\n\n` +
      `⚠️ Esta acción es IRREVERSIBLE.\n\n¿Continuar?`

    if (!window.confirm(mensaje)) return

    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('realizar_arqueo_caja', {
        p_efectivo_contado: efectivo,
        p_usuario_nombre: usuario
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error || 'Error en el arqueo')

      const diferencia = data.diferencia || 0
      const r = data.resumen || {}

      alert(
        `✅ ARQUEO COMPLETADO\n\n` +
        `• Ventas en efectivo: C$${(r.total_ventas_efectivo || 0).toFixed(2)} (${r.cantidad_ventas_efectivo || 0})\n` +
        `• Abonos en efectivo: C$${(r.total_abonos_efectivo || 0).toFixed(2)} (${r.cantidad_abonos_efectivo || 0})\n` +
        `• Gastos: C$${(r.total_gastos || 0).toFixed(2)} (${r.cantidad_gastos || 0})\n` +
        `• Efectivo neto esperado: C$${(r.efectivo_neto || 0).toFixed(2)}\n` +
        `• Efectivo contado: C$${efectivo.toFixed(2)}\n` +
        (Math.abs(diferencia) > 0.01
          ? `• Diferencia: C$${Math.abs(diferencia).toFixed(2)} ${diferencia > 0 ? '(Sobrante)' : '(Faltante)'}\n`
          : '') +
        `\n🗑️ ${r.cantidad_ventas || 0} ventas y ${r.cantidad_gastos || 0} gastos movidos a facturados`
      )

      cerrarModal()
      cargarArqueos()
    } catch (error) {
      console.error('Error en arqueo:', error)
      alert(`❌ ERROR: ${error.message || 'No se pudo completar el arqueo'}`)
    } finally {
      setLoading(false)
    }
  }

  // ---------- filtro ----------
  const arqueosFiltrados = arqueos.filter((a) => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      formatFechaNicaragua(a.fecha).toLowerCase().includes(q) ||
      (a.usuario || '').toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q)
    )
  })

  // ---------- exportar Excel ----------
  const exportarArqueoExcel = async (arqueo) => {
    try {
      setExportando((p) => ({ ...p, [arqueo.id]: 'excel' }))
      const { data: a, error } = await supabase
        .from('arqueos').select('*').eq('id', arqueo.id).single()
      if (error) throw error

      const hojaResumen = [
        ['COMPROBANTE DE ARQUEO', ''],
        ['Fecha', formatFechaNicaragua(a.fecha)],
        ['Usuario', a.usuario || 'Sistema'],
        ['ID', a.id],
        [],
        ['Ventas Totales', `C$${parseFloat(a.total_ventas || 0).toFixed(2)}`],
        ['Ventas Crédito', `C$${parseFloat(a.total_credito || 0).toFixed(2)}`],
        ['Ventas Efectivo', `C$${parseFloat(a.total_ventas_efectivo || 0).toFixed(2)}`],
        ['Ventas Tarjeta', `C$${parseFloat(a.total_ventas_tarjeta || 0).toFixed(2)}`],
        ['Ventas Transferencia', `C$${parseFloat(a.total_ventas_transferencia || 0).toFixed(2)}`],
        ['Abonos Efectivo', `C$${parseFloat(a.total_abonos_efectivo || 0).toFixed(2)}`],
        ['Abonos Tarjeta', `C$${parseFloat(a.total_abonos_tarjeta || 0).toFixed(2)}`],
        ['Abonos Transferencia', `C$${parseFloat(a.total_abonos_transferencia || 0).toFixed(2)}`],
        ['Efectivo Bruto', `C$${parseFloat(a.total_efectivo || 0).toFixed(2)}`],
        ['Gastos', `C$${parseFloat(a.total_gastos || 0).toFixed(2)}`],
        ['Efectivo en Caja', `C$${parseFloat(a.efectivo_en_caja || 0).toFixed(2)}`],
        ['Diferencia', `C$${Math.abs(parseFloat(a.diferencia_efectivo || 0)).toFixed(2)}`]
      ]

      const hojaDetalles = [
        ['REGISTROS PROCESADOS', 'CANTIDAD'],
        ['Ventas eliminadas', a.ventas_eliminadas || 0],
        ['Gastos eliminados', a.gastos_eliminados || 0],
        ['Abonos efectivo procesados', a.abonos_efectivo_eliminados || 0],
        ['Abonos tarjeta procesados', a.abonos_tarjeta_eliminados || 0],
        ['Abonos transferencia procesados', a.abonos_transferencia_eliminados || 0],
        ['Créditos procesados', a.creditos_completados_eliminados || 0]
      ]

      const wb = XLSX.utils.book_new()
      const ws1 = XLSX.utils.aoa_to_sheet(hojaResumen)
      ws1['!cols'] = [{ wch: 30 }, { wch: 25 }]
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')

      const ws2 = XLSX.utils.aoa_to_sheet(hojaDetalles)
      ws2['!cols'] = [{ wch: 35 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Detalles')

      const fechaArchivo = formatFechaNicaragua(a.fecha).replace(/[/: ]/g, '-')
      XLSX.writeFile(wb, `arqueo-${fechaArchivo}.xlsx`)
    } catch (error) {
      console.error('Error exportando Excel:', error)
      alert('Error al exportar a Excel')
    } finally {
      setTimeout(() => setExportando((p) => ({ ...p, [arqueo.id]: null })), 800)
    }
  }

  // ---------- exportar PDF ----------
  const exportarArqueoPDF = async (arqueo) => {
    try {
      setExportando((p) => ({ ...p, [arqueo.id]: 'pdf' }))
      const { data: a, error } = await supabase
        .from('arqueos').select('*').eq('id', arqueo.id).single()
      if (error) throw error

      const doc = new jsPDF()
      let y = 20

      doc.setFontSize(20)
      doc.setTextColor(80, 70, 230)
      doc.text('COMPROBANTE DE ARQUEO', 105, y, { align: 'center' })

      y += 8
      doc.setFontSize(11)
      doc.setTextColor(100)
      doc.text(`${NOMBRE_NEGOCIO} - Sistema de Caja`, 105, y, { align: 'center' })

      y += 12
      doc.setTextColor(50)
      ;[
        `Fecha: ${formatFechaNicaragua(a.fecha)}`,
        `Usuario: ${a.usuario || 'Sistema'}`,
        `ID: ${a.id}`
      ].forEach((t) => { doc.text(t, 20, y); y += 7 })

      y += 4
      doc.setFontSize(14)
      doc.setTextColor(80, 70, 230)
      doc.text('RESUMEN FINANCIERO', 20, y)
      y += 8
      doc.setFontSize(11)
      doc.setTextColor(50)

      const filas = [
        ['Ventas Totales', `C$${parseFloat(a.total_ventas || 0).toFixed(2)}`],
        ['Ventas Crédito', `C$${parseFloat(a.total_credito || 0).toFixed(2)}`],
        ['Ventas Efectivo', `C$${parseFloat(a.total_ventas_efectivo || 0).toFixed(2)}`],
        ['Ventas Tarjeta', `C$${parseFloat(a.total_ventas_tarjeta || 0).toFixed(2)}`],
        ['Ventas Transferencia', `C$${parseFloat(a.total_ventas_transferencia || 0).toFixed(2)}`],
        ['Abonos Efectivo', `C$${parseFloat(a.total_abonos_efectivo || 0).toFixed(2)}`],
        ['Abonos Tarjeta', `C$${parseFloat(a.total_abonos_tarjeta || 0).toFixed(2)}`],
        ['Abonos Transferencia', `C$${parseFloat(a.total_abonos_transferencia || 0).toFixed(2)}`],
        ['Efectivo Bruto', `C$${parseFloat(a.total_efectivo || 0).toFixed(2)}`],
        ['Gastos', `C$${parseFloat(a.total_gastos || 0).toFixed(2)}`],
        ['Efectivo en Caja', `C$${parseFloat(a.efectivo_en_caja || 0).toFixed(2)}`],
        ['Diferencia', `C$${Math.abs(parseFloat(a.diferencia_efectivo || 0)).toFixed(2)}`]
      ]
      filas.forEach(([label, valor]) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(label, 25, y)
        doc.text(valor, 130, y)
        y += 7
      })

      const h = doc.internal.pageSize.height
      doc.setFontSize(9)
      doc.setTextColor(150)
      doc.text('Documento generado automáticamente', 105, h - 10, { align: 'center' })

      const fechaArchivo = formatFechaNicaragua(a.fecha).replace(/[/: ]/g, '-')
      doc.save(`arqueo-${fechaArchivo}.pdf`)
    } catch (error) {
      console.error('Error exportando PDF:', error)
      alert('Error al exportar a PDF')
    } finally {
      setTimeout(() => setExportando((p) => ({ ...p, [arqueo.id]: null })), 800)
    }
  }

  const scrollTabla = (px) => {
    const el = document.querySelector('.tabla-scroll-container')
    if (el) el.scrollBy({ left: px, behavior: 'smooth' })
  }

  const resumenMobile = {
    totalArqueos: arqueosFiltrados.length,
    totalVentas: arqueosFiltrados.reduce((s, a) => s + parseFloat(a.total_ventas || 0), 0),
    totalGastos: arqueosFiltrados.reduce((s, a) => s + parseFloat(a.total_gastos || 0), 0),
    totalEfectivo: arqueosFiltrados.reduce((s, a) => s + parseFloat(a.efectivo_en_caja || 0), 0)
  }

  return (
    <>
      <Encabezado />

      <div className="arqueos-page">
        <div className="arqueos-container">
          {/* Buscador móvil */}
          <div className="buscador-mobile mobile-only">
            <div className="buscador-mobile-container">
              <input
                type="text"
                placeholder="Buscar por fecha o usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="buscador-mobile-input"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="buscador-mobile-limpiar">✕</button>
              )}
            </div>
          </div>

          <ArqueoHeader
            ultimoArqueo={ultimoArqueo}
            loading={loading}
            calculando={calculando}
            onAbrirModal={abrirModal}
          />

          <ArqueoEstadisticas arqueos={arqueos} ultimoArqueo={ultimoArqueo} />

          <div className="tabla-arqueos-container">
            <div className="tabla-arqueos-card">
              <ArqueoTablaDesktop
                loading={loading}
                arqueos={arqueos}
                arqueosFiltrados={arqueosFiltrados}
                busqueda={busqueda}
                exportando={exportando}
                onExportarExcel={exportarArqueoExcel}
                onExportarPDF={exportarArqueoPDF}
                onScroll={scrollTabla}
              />

              {/* Vista móvil */}
              <div className="tabla-mobile-view mobile-only">
                {loading ? (
                  <div className="sin-resultados-mobile">
                    <div className="spinner"></div>
                    <p>Cargando arqueos...</p>
                  </div>
                ) : arqueosFiltrados.length === 0 ? (
                  <div className="sin-resultados-mobile">
                    <p>{busqueda ? 'No se encontraron arqueos' : 'No hay arqueos registrados'}</p>
                  </div>
                ) : (
                  arqueosFiltrados.map((a) => (
                    <ArqueoCardMobile
                      key={a.id}
                      arqueo={a}
                      exportando={exportando}
                      onExportarExcel={exportarArqueoExcel}
                      onExportarPDF={exportarArqueoPDF}
                    />
                  ))
                )}
              </div>

              <ArqueoResumenMobile
                visible={!loading && resumenMobile.totalArqueos > 0}
                resumen={resumenMobile}
              />
            </div>
          </div>

          <ArqueoModal
            abierto={modalAbierto}
            resumenTurno={resumenTurno}
            efectivoContado={efectivoContado}
            loading={loading}
            onCambiarEfectivo={setEfectivoContado}
            onCerrar={cerrarModal}
            onConfirmar={realizarArqueo}
          />
        </div>
      </div>
    </>
  )
}

export default Arqueos
