// src/views/ReportesMensuales.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../database/supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Encabezado from '../components/Encabezado'
import './ReportesMensuales.css'

const ReportesMensuales = () => {
  const [facturas, setFacturas] = useState([])
  const [facturasFiltradas, setFacturasFiltradas] = useState([])
  const [loading, setLoading] = useState(true)

  // ✅ NUEVO: modo de agrupación
  const [modoVista, setModoVista] = useState('mes') // 'mes' | 'semana'

  const [filtroMes, setFiltroMes] = useState(() => {
    const ahora = new Date()
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
  })

  // ✅ NUEVO: semana seleccionada (1-5). 1 = días 1-7, 2 = 8-14, etc.
  const [filtroSemana, setFiltroSemana] = useState(1)

  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroMetodo, setFiltroMetodo] = useState('todos')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')

  const [resumen, setResumen] = useState({
    totalVentas: 0,
    totalCreditos: 0,
    totalAbonos: 0,
    totalEfectivo: 0,
    totalTarjeta: 0,
    totalTransferencia: 0,
    totalGastos: 0,
    cantidadRegistros: 0,
    cantidadGastos: 0
  })
  const [exportando, setExportando] = useState(false)

useEffect(() => {
  cargarFacturas()
}, [filtroMes, modoVista, filtroSemana])

  useEffect(() => {
    aplicarFiltros()
  }, [facturas, filtroTipo, filtroMetodo, filtroBusqueda, modoVista, filtroSemana])

  // ============================================
  // RANGO DE FECHAS SEGÚN MODO (mes o semana)
  // ============================================
  const calcularRango = () => {
    const [year, month] = filtroMes.split('-')

    if (modoVista === 'mes') {
      const inicioMes = `${year}-${String(month).padStart(2, '0')}-01T00:00:00-06:00`
      const ultimoDia = new Date(year, month, 0).getDate()
      const finMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}T23:59:59-06:00`
      return { inicioMes, finMes }
    }

    // Modo semana
    const ultimoDia = new Date(year, month, 0).getDate()
    const diaInicio = (filtroSemana - 1) * 7 + 1
    const diaFin = Math.min(filtroSemana * 7, ultimoDia)

    const inicioMes = `${year}-${String(month).padStart(2, '0')}-${String(diaInicio).padStart(2, '0')}T00:00:00-06:00`
    const finMes = `${year}-${String(month).padStart(2, '0')}-${String(diaFin).padStart(2, '0')}T23:59:59-06:00`
    return { inicioMes, finMes }
  }

  // ============================================
  // FUNCIÓN PRINCIPAL PARA CARGAR FACTURAS
  // ============================================
  const cargarFacturas = async () => {
    try {
      setLoading(true)

      const { inicioMes, finMes } = calcularRango()

      // Cargar TODAS las facturas del rango por lotes
      let data = []
      let desde = 0
      const tamanoLote = 1000
      let sigueHabiendoDatos = true

      while (sigueHabiendoDatos) {
        const { data: lote, error } = await supabase
          .from('facturados')
          .select('*')
          .gte('fecha', inicioMes)
          .lt('fecha', finMes)
          .order('fecha', { ascending: false })
          .range(desde, desde + tamanoLote - 1)

        if (error) throw error

        if (lote && lote.length > 0) {
          data = [...data, ...lote]
          desde += tamanoLote
          sigueHabiendoDatos = lote.length === tamanoLote
        } else {
          sigueHabiendoDatos = false
        }
      }

      // ============================================
      // OBTENER PRODUCTOS RELACIONADOS
      // ============================================
      const productosIds = [...new Set(
        (data || [])
          .filter(f => f.producto_id)
          .map(f => f.producto_id)
      )]

      let productosMap = {}
      if (productosIds.length > 0) {
        const { data: productos } = await supabase
          .from('productos')
          .select('id, nombre, codigo_barras')
          .in('id', productosIds)

        productosMap = (productos || []).reduce((acc, prod) => {
          acc[prod.id] = prod
          return acc
        }, {})
      }

      // ============================================
      // OBTENER CLIENTES RELACIONADOS
      // ============================================
      const clientesIds = [...new Set(
        (data || [])
          .filter(f => f.cliente_id)
          .map(f => f.cliente_id)
      )]

      let clientesMap = {}
      if (clientesIds.length > 0) {
        const { data: clientes } = await supabase
          .from('clientes')
          .select('id, nombre')
          .in('id', clientesIds)

        clientesMap = (clientes || []).reduce((acc, c) => {
          acc[c.id] = c
          return acc
        }, {})
      }

      // ============================================
      // PROCESAR CADA FACTURA
      // ============================================
      const facturasProcesadas = (data || []).map(factura => {
        let detalle = ''
        const productoInfo = factura.producto_id ? productosMap[factura.producto_id] : null
        const clienteInfo = factura.cliente_id ? clientesMap[factura.cliente_id] : null
        const jsonDetalle = factura.detalle || {}

        if (factura.tipo === 'venta') {
          if (productoInfo) {
            detalle = `${productoInfo.nombre}${productoInfo.codigo_barras ? ` (${productoInfo.codigo_barras})` : ''}`
          } else if (jsonDetalle.producto_nombre) {
            detalle = jsonDetalle.producto_nombre
          } else {
            detalle = `Venta C$${parseFloat(factura.monto || 0).toFixed(2)}`
          }
        } else if (factura.tipo === 'credito') {
          if (productoInfo) {
            detalle = `${productoInfo.nombre}`
          } else if (jsonDetalle.producto_nombre) {
            detalle = jsonDetalle.producto_nombre
          } else if (clienteInfo) {
            detalle = `Crédito: ${clienteInfo.nombre}`
          } else {
            detalle = 'Crédito'
          }
        } else if (factura.tipo === 'abono') {
          if (clienteInfo) {
            detalle = `Abono - ${clienteInfo.nombre}`
          } else {
            detalle = 'Abono'
          }
        } else if (factura.tipo === 'gasto') {
          detalle = jsonDetalle.descripcion || 'Gasto sin descripción'
        }

        return {
          ...factura,
          fecha_formateada: formatFechaNicaragua(factura.fecha),
          detalle_texto: detalle,
          producto_nombre: productoInfo?.nombre || null,
          producto_codigo: productoInfo?.codigo_barras || null,
          cliente_nombre: clienteInfo?.nombre || null
        }
      })

      setFacturas(facturasProcesadas)
    } catch (error) {
      console.error('Error cargando facturas:', error)
      alert('Error al cargar los reportes mensuales')
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = () => {
    let filtradas = [...facturas]

    if (filtroTipo !== 'todos') {
      filtradas = filtradas.filter(f => f.tipo === filtroTipo)
    }

    if (filtroMetodo !== 'todos') {
      filtradas = filtradas.filter(f => f.metodo_pago === filtroMetodo)
    }

    if (filtroBusqueda.trim() !== '') {
      const termino = filtroBusqueda.toLowerCase()
      filtradas = filtradas.filter(f => {
        return (
          (f.detalle_texto && f.detalle_texto.toLowerCase().includes(termino)) ||
          (f.cliente_nombre && f.cliente_nombre.toLowerCase().includes(termino)) ||
          (f.producto_nombre && f.producto_nombre.toLowerCase().includes(termino)) ||
          (String(f.id) && String(f.id).toLowerCase().includes(termino))
        )
      })
    }

    setFacturasFiltradas(filtradas)
    calcularResumen(filtradas)
  }

  const formatFechaNicaragua = (fechaISO) => {
    if (!fechaISO) return 'Fecha no disponible'
    try {
      const fechaUTC = new Date(fechaISO)
      const fechaNic = new Date(fechaUTC.getTime() - (6 * 60 * 60 * 1000))

      const d = fechaNic.getDate().toString().padStart(2, '0')
      const m = (fechaNic.getMonth() + 1).toString().padStart(2, '0')
      const y = fechaNic.getFullYear()

      let h = fechaNic.getHours()
      const min = fechaNic.getMinutes().toString().padStart(2, '0')
      const ampm = h >= 12 ? 'p.m.' : 'a.m.'

      h = h % 12
      h = h ? h.toString().padStart(2, '0') : '12'

      return `${d}/${m}/${y} ${h}:${min} ${ampm}`
    } catch (e) {
      return fechaISO
    }
  }

  const obtenerTextoDetalle = (factura) => factura.detalle_texto || 'Sin detalle'

  const calcularResumen = (facturasData) => {
    let totalVentas = 0
    let totalCreditos = 0
    let totalAbonos = 0
    let totalEfectivo = 0
    let totalTarjeta = 0
    let totalTransferencia = 0
    let totalGastos = 0
    let cantidadGastos = 0

    facturasData.forEach(f => {
      const monto = parseFloat(f.monto || 0)

      if (f.tipo === 'venta') totalVentas += monto
      if (f.tipo === 'credito') totalCreditos += monto
      if (f.tipo === 'abono') totalAbonos += monto
      if (f.tipo === 'gasto') {
        totalGastos += monto
        cantidadGastos++
      }

      if (f.tipo === 'venta' || f.tipo === 'abono') {
        if (f.metodo_pago === 'efectivo') totalEfectivo += monto
        else if (f.metodo_pago === 'tarjeta') totalTarjeta += monto
        else if (f.metodo_pago === 'transferencia') totalTransferencia += monto
        else if (f.metodo_pago === 'mixto') {
          totalEfectivo += parseFloat(f.efectivo || 0)
          totalTarjeta += parseFloat(f.tarjeta || 0)
          totalTransferencia += parseFloat(f.transferencia || 0)
        }
      }
    })

    setResumen({
      totalVentas,
      totalCreditos,
      totalAbonos,
      totalEfectivo,
      totalTarjeta,
      totalTransferencia,
      totalGastos,
      cantidadRegistros: facturasData.length,
      cantidadGastos
    })
  }

  const generarMesesDisponibles = () => {
    const meses = []
    const ahora = new Date()

    for (let i = 0; i < 12; i++) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const valor = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      const nombre = fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })
      meses.push({ valor, nombre })
    }

    return meses
  }

  // ✅ NUEVO: genera las semanas disponibles del mes elegido
  const generarSemanasDisponibles = () => {
    const [year, month] = filtroMes.split('-')
    const ultimoDia = new Date(year, month, 0).getDate()
    const totalSemanas = Math.ceil(ultimoDia / 7)

    const semanas = []
    for (let i = 1; i <= totalSemanas; i++) {
      const diaInicio = (i - 1) * 7 + 1
      const diaFin = Math.min(i * 7, ultimoDia)
      semanas.push({
        valor: i,
        nombre: `Semana ${i} (${diaInicio} - ${diaFin})`
      })
    }
    return semanas
  }

  const nombreTipo = (tipo) =>
    tipo === 'gasto' ? 'Gasto' :
    tipo === 'credito' ? 'Crédito' :
    tipo === 'venta' ? 'Venta' :
    tipo === 'abono' ? 'Abono' :
    tipo

  // ✅ Texto que va en los archivos exportados
  const obtenerTextoPeriodo = () => {
    const [year, month] = filtroMes.split('-')
    const nombreMes = new Date(year, month - 1).toLocaleDateString('es-MX', { month: 'long' })

    if (modoVista === 'mes') {
      return `${nombreMes} ${year}`
    }
    const semanas = generarSemanasDisponibles()
    const semana = semanas.find(s => s.valor === filtroSemana)
    return `${semana?.nombre || 'Semana'} - ${nombreMes} ${year}`
  }

  const nombreArchivo = () => {
    const [year, month] = filtroMes.split('-')
    const nombreMes = new Date(year, month - 1).toLocaleDateString('es-MX', { month: 'long' })
    if (modoVista === 'mes') return `facturas_${nombreMes}_${year}`
    return `facturas_semana${filtroSemana}_${nombreMes}_${year}`
  }

  const exportarExcel = () => {
    try {
      setExportando(true)

      const datosExcel = facturasFiltradas.map(f => ({
        'Fecha': formatFechaNicaragua(f.fecha).split(' ')[0],
        'Tipo': nombreTipo(f.tipo),
        'Detalle': obtenerTextoDetalle(f),
        'Método': f.metodo_pago || '',
        'Monto': `C$${parseFloat(f.monto || 0).toFixed(2)}`
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(datosExcel)
      ws['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, ws, 'Facturas')

      const resumenData = [
        { 'Concepto': 'Período', 'Monto': obtenerTextoPeriodo() },
        { 'Concepto': 'Total Ventas', 'Monto': `C$${resumen.totalVentas.toFixed(2)}` },
        { 'Concepto': 'Ventas a Crédito', 'Monto': `C$${resumen.totalCreditos.toFixed(2)}` },
        { 'Concepto': 'Abonos', 'Monto': `C$${resumen.totalAbonos.toFixed(2)}` },
        { 'Concepto': 'Efectivo', 'Monto': `C$${resumen.totalEfectivo.toFixed(2)}` },
        { 'Concepto': 'Tarjeta', 'Monto': `C$${resumen.totalTarjeta.toFixed(2)}` },
        { 'Concepto': 'Transferencia', 'Monto': `C$${resumen.totalTransferencia.toFixed(2)}` },
        { 'Concepto': 'Total Gastos', 'Monto': `C$${resumen.totalGastos.toFixed(2)}` },
        { 'Concepto': 'Cantidad Gastos', 'Monto': resumen.cantidadGastos },
        { 'Concepto': 'Registros Mostrados', 'Monto': resumen.cantidadRegistros }
      ]

      const wsResumen = XLSX.utils.json_to_sheet(resumenData)
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

      XLSX.writeFile(wb, `${nombreArchivo()}.xlsx`)
      setTimeout(() => setExportando(false), 1000)
    } catch (error) {
      console.error('Error exportando Excel:', error)
      alert('Error al exportar a Excel')
      setExportando(false)
    }
  }

  const exportarPDF = () => {
    try {
      setExportando(true)

      const doc = new jsPDF('landscape')
      const periodo = obtenerTextoPeriodo()

      doc.setFontSize(18)
      doc.setTextColor(139, 92, 246)
      doc.text(`Reporte de Facturas - ${periodo}`, 148, 20, { align: 'center' })

      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-MX')}`, 148, 30, { align: 'center' })

      let filtrosTexto = 'Filtros: '
      if (filtroTipo !== 'todos') filtrosTexto += `Tipo: ${nombreTipo(filtroTipo)} `
      if (filtroMetodo !== 'todos') filtrosTexto += `Método: ${filtroMetodo} `
      if (filtroBusqueda) filtrosTexto += `Búsqueda: "${filtroBusqueda}" `
      if (filtrosTexto === 'Filtros: ') filtrosTexto = 'Filtros: Todos'

      doc.setFontSize(10)
      doc.setTextColor(55, 65, 81)
      doc.text(filtrosTexto, 20, 40)

      doc.setFontSize(14)
      doc.setTextColor(30, 41, 59)
      doc.text('Resumen del Período', 20, 55)

      doc.setFontSize(10)
      doc.setTextColor(55, 65, 81)
      let y = 65
      const resumenItems = [
        `Total Ventas: C$${resumen.totalVentas.toFixed(2)}`,
        `Ventas a Crédito: C$${resumen.totalCreditos.toFixed(2)}`,
        `Abonos: C$${resumen.totalAbonos.toFixed(2)}`,
        `Efectivo: C$${resumen.totalEfectivo.toFixed(2)}`,
        `Tarjeta: C$${resumen.totalTarjeta.toFixed(2)}`,
        `Transferencia: C$${resumen.totalTransferencia.toFixed(2)}`,
        `Total Gastos: C$${resumen.totalGastos.toFixed(2)}`,
        `Cantidad Gastos: ${resumen.cantidadGastos}`,
        `Registros Mostrados: ${resumen.cantidadRegistros}`
      ]
      resumenItems.forEach(item => { doc.text(item, 25, y); y += 7 })

      const tableColumn = ['Fecha', 'Tipo', 'Detalle', 'Método', 'Monto']
      const tableRows = facturasFiltradas.map(f => [
        formatFechaNicaragua(f.fecha).split(' ')[0],
        nombreTipo(f.tipo),
        obtenerTextoDetalle(f),
        f.metodo_pago || '',
        `C$${parseFloat(f.monto || 0).toFixed(2)}`
      ])

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: y + 10,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { cellWidth: 100 },
          3: { cellWidth: 35 },
          4: { cellWidth: 30 }
        }
      })

      doc.save(`${nombreArchivo()}.pdf`)
      setTimeout(() => setExportando(false), 1000)
    } catch (error) {
      console.error('Error exportando PDF:', error)
      alert(`Error al exportar a PDF: ${error.message}`)
      setExportando(false)
    }
  }

  const mesesDisponibles = generarMesesDisponibles()
  const semanasDisponibles = generarSemanasDisponibles()

  return (
    <>
      <Encabezado />

      <div className="reportes-page">
        <div className="reportes-container">
          <div className="reportes-header">
            <div className="reportes-titulo-container">
              <h1 className="reportes-titulo">Reportes Mensuales</h1>
              <p className="reportes-subtitulo">Facturas archivadas por mes o semana</p>
            </div>

            <div className="reportes-botones-header">
              {/* ✅ NUEVO: selector de modo */}
              <select
                value={modoVista}
                onChange={(e) => setModoVista(e.target.value)}
                className="selector-mes"
                disabled={loading}
                style={{ marginRight: '10px', minWidth: '120px' }}
              >
                <option value="mes">Por Mes</option>
                <option value="semana">Por Semana</option>
              </select>

              {/* Selector de mes (siempre visible) */}
              <select
                value={filtroMes}
                onChange={(e) => {
                  setFiltroMes(e.target.value)
                  setFiltroSemana(1) // reiniciar semana al cambiar de mes
                }}
                className="selector-mes"
                disabled={loading}
              >
                {mesesDisponibles.map(({ valor, nombre }) => (
                  <option key={valor} value={valor}>
                    {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
                  </option>
                ))}
              </select>

              {/* ✅ NUEVO: selector de semana (solo si modo = semana) */}
              {modoVista === 'semana' && (
                <select
                  value={filtroSemana}
                  onChange={(e) => setFiltroSemana(Number(e.target.value))}
                  className="selector-mes"
                  disabled={loading}
                  style={{ marginLeft: '10px' }}
                >
                  {semanasDisponibles.map(({ valor, nombre }) => (
                    <option key={valor} value={valor}>{nombre}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="filtros-adicionales">
            <div className="filtro-grupo">
              <label className="filtro-label">Tipo:</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="filtro-select">
                <option value="todos">Todos</option>
                <option value="venta">Ventas</option>
                <option value="credito">Créditos</option>
                <option value="gasto">Gastos</option>
                <option value="abono">Abonos</option>
              </select>
            </div>

            <div className="filtro-grupo">
              <label className="filtro-label">Método:</label>
              <select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)} className="filtro-select">
                <option value="todos">Todos</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>

            <div className="filtro-grupo buscador">
              <label className="filtro-label">Buscar:</label>
              <input
                type="text"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                placeholder="Producto, cliente, descripción..."
                className="filtro-input"
              />
              {filtroBusqueda && (
                <button className="filtro-limpiar" onClick={() => setFiltroBusqueda('')}>✕</button>
              )}
            </div>

            <div className="filtro-info">
              Mostrando {facturasFiltradas.length} de {facturas.length} registros
            </div>
          </div>

          <div className="resumen-grid">
            <div className="resumen-card total-card">
              <div className="resumen-card-content">
                <span className="resumen-card-label">TOTAL VENTAS</span>
                <strong className="resumen-card-value">
                  C${resumen.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
                <span className="resumen-card-sub">{resumen.cantidadRegistros} registros</span>
              </div>
              <div className="resumen-card-icon">💰</div>
            </div>

            <div className="resumen-card credito-card">
              <div className="resumen-card-content">
                <span className="resumen-card-label">VENTAS CRÉDITO</span>
                <strong className="resumen-card-value">
                  C${resumen.totalCreditos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="resumen-card-icon">💳</div>
            </div>

            <div className="resumen-card efectivo-card">
              <div className="resumen-card-content">
                <span className="resumen-card-label">EFECTIVO</span>
                <strong className="resumen-card-value">
                  C${resumen.totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="resumen-card-icon">💵</div>
            </div>

            <div className="resumen-card tarjeta-card">
              <div className="resumen-card-content">
                <span className="resumen-card-label">TARJETA</span>
                <strong className="resumen-card-value">
                  C${resumen.totalTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="resumen-card-icon">💳</div>
            </div>

            <div className="resumen-card transferencia-card">
              <div className="resumen-card-content">
                <span className="resumen-card-label">TRANSFERENCIA</span>
                <strong className="resumen-card-value">
                  C${resumen.totalTransferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="resumen-card-icon">🏦</div>
            </div>

            <div className="resumen-card gastos-card">
              <div className="resumen-card-content">
                <span className="resumen-card-label">TOTAL GASTOS</span>
                <strong className="resumen-card-value">
                  C${resumen.totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
                <span className="resumen-card-sub">{resumen.cantidadGastos} gastos</span>
              </div>
              <div className="resumen-card-icon">📉</div>
            </div>
          </div>

          <div className="export-buttons">
            <button
              onClick={exportarExcel}
              disabled={loading || facturasFiltradas.length === 0 || exportando}
              className="btn-exportar excel"
            >
              {exportando ? (<><span className="spinner-mini"></span>Exportando...</>) : (<><span className="btn-icon">📊</span>Exportar Excel</>)}
            </button>
            <button
              onClick={exportarPDF}
              disabled={loading || facturasFiltradas.length === 0 || exportando}
              className="btn-exportar pdf"
            >
              {exportando ? (<><span className="spinner-mini"></span>Exportando...</>) : (<><span className="btn-icon">📄</span>Exportar PDF</>)}
            </button>
          </div>

          <div className="tabla-facturas-container">
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Cargando facturas...</p>
              </div>
            ) : facturasFiltradas.length === 0 ? (
              <div className="sin-datos">
                <p>No hay facturas para los filtros seleccionados</p>
              </div>
            ) : (
              <div className="tabla-scroll">
                <table className="tabla-facturas">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Detalle</th>
                      <th>Método</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasFiltradas.map((factura) => (
                      <tr key={factura.id}>
                        <td className="col-fecha">{formatFechaNicaragua(factura.fecha)}</td>
                        <td className="col-tipo">
                          <span className={`badge-tipo ${factura.tipo}`}>
                            {nombreTipo(factura.tipo)}
                          </span>
                        </td>
                        <td className="col-detalle" title={obtenerTextoDetalle(factura)}>
                          {obtenerTextoDetalle(factura)}
                        </td>
                        <td className="col-metodo">
                          <span className={`badge-metodo ${factura.metodo_pago || 'default'}`}>
                            {factura.metodo_pago || 'No especificado'}
                          </span>
                        </td>
                        <td className="col-monto">C${parseFloat(factura.monto || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default ReportesMensuales
