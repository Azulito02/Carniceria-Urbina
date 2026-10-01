import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import FormularioVenta from '../components/ventas/FormularioVenta';
import TablaVenta from '../components/ventas/TablaVenta';
import ModalAgregarProductoVenta from '../components/ventas/ModalAgregarProductoVenta';
import ModalFacturasDia from '../components/ventas/ModalFacturasDia';
import ModalVerFactura from '../components/ventas/ModalVerFactura';
import usePreciosCliente from '../hooks/usePreciosCliente';
import {
  obtenerMapaStock,
  avisosStockTrasVenta,
  notificarCambioStock
} from '../services/StockService';
import './Ventas.css';

function Ventas() {
  const navigate = useNavigate();

  // ===== DATOS =====
  const { data: productos } = useRealtimeSync('productos', 'productos_cache');
  const [clientes, setClientes] = useState([]);

  // ===== STOCK DISPONIBLE (inventario - ventas) =====
  const [stockMapa, setStockMapa] = useState({});
  const [alertasStock, setAlertasStock] = useState([]);

  // ===== ESTADOS DEL FORMULARIO =====
  const [clienteSeleccionado, setClienteSeleccionado] = useState('general');
  const [metodoPago, setMetodoPago] = useState('contado');
  const [banco, setBanco] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [lineasVenta, setLineasVenta] = useState([]);

  // ===== CAMPOS DE PAGO =====
  const [efectivo, setEfectivo] = useState('');
  const [tarjeta, setTarjeta] = useState('');
  const [transferencia, setTransferencia] = useState('');
  const [vuelto, setVuelto] = useState('0.00');

  // ===== SALDO ANTERIOR =====
  const [saldoAnterior, setSaldoAnterior] = useState(0);
  const [creditoAnterior, setCreditoAnterior] = useState(null);
  const [sumarSaldoAnterior, setSumarSaldoAnterior] = useState(true);

  // ===== MODALES =====
  const [modalFacturasDia, setModalFacturasDia] = useState(false);
  const [modalVerFactura, setModalVerFactura] = useState(false);
  const [modalAgregarProducto, setModalAgregarProducto] = useState(false);
  const [numeroFacturaVer, setNumeroFacturaVer] = useState('');

  // ===== MENSAJES =====
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // ===== HOOK PRECIOS POR CLIENTE =====
  const { preciosCliente } = usePreciosCliente(clienteSeleccionado);

  // ===== CARGAR STOCK DISPONIBLE =====
  const cargarStock = async () => {
    const mapa = await obtenerMapaStock();
    setStockMapa(mapa);
    return mapa;
  };

  useEffect(() => {
    cargarStock();
  }, []);

  // ===== CARGAR CLIENTES =====
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nombre')
          .order('nombre');
        
        if (error) throw error;
        setClientes(data || []);
      } catch (err) {
        console.error('Error cargando clientes:', err);
      }
    };
    cargarClientes();
  }, []);

  // ===== BUSCAR SALDO ANTERIOR DEL CLIENTE =====
  useEffect(() => {
    const buscarSaldoAnterior = async () => {
      setSaldoAnterior(0);
      setCreditoAnterior(null);

      if (!clienteSeleccionado || clienteSeleccionado === 'general') return;

      try {
        const clienteId = parseInt(clienteSeleccionado);

        const { data, error } = await supabase
          .from('creditos')
          .select('*')
          .eq('cliente_id', clienteId)
          .eq('estado', 'activo')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const totalSaldo = data.reduce((sum, c) => sum + parseFloat(c.saldo_pendiente || 0), 0);
          setSaldoAnterior(totalSaldo);
          setCreditoAnterior(data);
        }
      } catch (err) {
        console.error('Error buscando saldo anterior:', err);
      }
    };

    buscarSaldoAnterior();
  }, [clienteSeleccionado]);

  // ===== FECHA VENCIMIENTO (8 DÍAS) =====
  useEffect(() => {
    if (metodoPago === 'credito') {
      const hoy = new Date();
      hoy.setDate(hoy.getDate() + 8);
      setFechaVencimiento(hoy.toISOString().split('T')[0]);
    } else {
      setFechaVencimiento('');
    }
  }, [metodoPago]);

  // ===== LIMPIAR CAMPOS DE PAGO =====
  useEffect(() => {
    setEfectivo('');
    setTarjeta('');
    setTransferencia('');
    setVuelto('0.00');
    setBanco('');
  }, [metodoPago]);

  // ===== GENERAR NÚMERO DE FACTURA =====
  const generarNumeroFactura = async () => {
    try {
      const hoy = new Date();
      const fechaStr = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;

      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0).toISOString();
      const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('ventas')
        .select('numero_factura')
        .gte('fecha', inicioDia)
        .lte('fecha', finDia);

      if (error) console.error('Error obteniendo último número:', error);

      let correlativo = 1;
      if (data && data.length > 0) {
        const correlativos = data
          .map(v => {
            const partes = v.numero_factura?.split('-');
            if (partes && partes.length === 2) return parseInt(partes[1]) || 0;
            return 0;
          })
          .filter(n => n > 0);
        
        if (correlativos.length > 0) correlativo = Math.max(...correlativos) + 1;
      }

      return `${fechaStr}-${String(correlativo).padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generando número:', err);
      const timestamp = Date.now().toString().slice(-6);
      const hoy = new Date();
      const fechaStr = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
      return `${fechaStr}-${timestamp}`;
    }
  };

  // ===== AGREGAR PRODUCTO DESDE MODAL =====
  const agregarProductoDesdeModal = (nuevaLinea) => {
    setLineasVenta(prev => {
      const existe = prev.find(l => l.producto_id === nuevaLinea.producto_id);
      
      if (existe) {
        return prev.map(l =>
          l.producto_id === nuevaLinea.producto_id
            ? {
                ...l,
                cantidad: nuevaLinea.cantidad,
                precio_unitario: nuevaLinea.precio_unitario,
                total: nuevaLinea.total
              }
            : l
        );
      } else {
        return [...prev, nuevaLinea];
      }
    });
  };

  // ===== REVISAR STOCK DESPUÉS DE GUARDAR LA VENTA =====
  // Nunca debe romper el flujo: la venta ya está guardada en este punto.
  const revisarStockTrasVenta = async (idsVendidos) => {
    try {
      const avisos = await avisosStockTrasVenta(idsVendidos);
      setAlertasStock(avisos);
      if (avisos.length > 0) {
        setTimeout(() => setAlertasStock([]), 15000);
      }
      notificarCambioStock(); // actualiza la campanita del encabezado
      await cargarStock();
    } catch (err) {
      console.error('Error revisando stock tras la venta:', err);
    }
  };

  // ===== GUARDAR VENTA =====
  const guardarVenta = async () => {
    try {
      setError(null);

      if (lineasVenta.length === 0) {
        setError('Agrega al menos un producto');
        setTimeout(() => setError(null), 4000);
        return;
      }

      if (metodoPago === 'credito' && clienteSeleccionado === 'general') {
        setError('Para crédito debes seleccionar un cliente específico');
        setTimeout(() => setError(null), 4000);
        return;
      }

      const totalProductosNuevos = lineasVenta.reduce((sum, l) => sum + l.total, 0);
      const efectivoNum = parseFloat(efectivo) || 0;
      const tarjetaNum = parseFloat(tarjeta) || 0;
      const transferenciaNum = parseFloat(transferencia) || 0;
      const vueltoNum = parseFloat(vuelto) || 0;
      const totalPagado = efectivoNum + tarjetaNum + transferenciaNum;

      if (metodoPago === 'contado' && totalPagado < totalProductosNuevos) {
        setError(`El total pagado (C$${totalPagado.toFixed(2)}) es menor al total de la venta (C$${totalProductosNuevos.toFixed(2)})`);
        setTimeout(() => setError(null), 5000);
        return;
      }

      // ===== ADVERTIR SI SE VENDE MÁS DE LO DISPONIBLE =====
      const idsVendidos = lineasVenta.map(l => l.producto_id);
      const stockFresco = await obtenerMapaStock();
      const insuficientes = lineasVenta.filter(l => {
        const s = stockFresco[l.producto_id];
        return s && Number(l.cantidad) > s.stock_disponible;
      });

      if (insuficientes.length > 0) {
        const detalle = insuficientes
          .map(l => {
            const s = stockFresco[l.producto_id];
            return `• ${s.nombre}: vendes ${Number(l.cantidad).toFixed(2)} y hay ${Math.max(0, s.stock_disponible).toFixed(2)} ${s.unidad_medida || ''}`;
          })
          .join('\n');

        const continuar = window.confirm(
          `⚠️ Stock insuficiente según el inventario:\n\n${detalle}\n\n¿Guardar la venta de todas formas?`
        );
        if (!continuar) return;
      }

      const aplicarSaldoAnterior = metodoPago === 'credito' && saldoAnterior > 0 && sumarSaldoAnterior;
      const saldoAAgregar = aplicarSaldoAnterior ? saldoAnterior : 0;
      const totalFacturaConSaldo = totalProductosNuevos + saldoAAgregar;

      setGuardando(true);

      const numeroFactura = await generarNumeroFactura();
      const clienteIdFinal = clienteSeleccionado === 'general' ? null : parseInt(clienteSeleccionado);

      let metodoPagoBD = 'efectivo';
      
      if (metodoPago === 'credito') {
        metodoPagoBD = 'credito';
      } else {
        const metodosConMonto = [];
        if (efectivoNum > 0) metodosConMonto.push('efectivo');
        if (tarjetaNum > 0) metodosConMonto.push('tarjeta');
        if (transferenciaNum > 0) metodosConMonto.push('transferencia');
        
        if (metodosConMonto.length === 0) metodoPagoBD = 'efectivo';
        else if (metodosConMonto.length === 1) metodoPagoBD = metodosConMonto[0];
        else metodoPagoBD = 'mixto';
      }

      const estadoBD = metodoPago === 'credito' ? 'credito' : 'completada';

      const filasVenta = lineasVenta.map(l => ({
        producto_id: l.producto_id,
        cliente_id: clienteIdFinal,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        total: l.total,
        metodo_pago: metodoPagoBD,
        banco: banco || null,
        efectivo: efectivoNum,
        tarjeta: tarjetaNum,
        transferencia: transferenciaNum,
        vuelto: vueltoNum,
        estado: estadoBD,
        numero_factura: numeroFactura,
        usuario: 'Admin'
      }));

      const { data: ventasInsertadas, error: errVenta } = await supabase
        .from('ventas')
        .insert(filasVenta)
        .select();

      if (errVenta) throw errVenta;

      if (metodoPago === 'credito' && clienteIdFinal) {
        let ventaIdPrincipal = null;
        
        if (ventasInsertadas && ventasInsertadas.length > 0 && ventasInsertadas[0].id) {
          ventaIdPrincipal = ventasInsertadas[0].id;
        } else {
          const { data: ventaBuscada } = await supabase
            .from('ventas')
            .select('id')
            .eq('numero_factura', numeroFactura)
            .limit(1)
            .maybeSingle();
          
          if (ventaBuscada) ventaIdPrincipal = ventaBuscada.id;
        }

        const abonoInicial = totalPagado;
        const saldoPendiente = totalFacturaConSaldo - abonoInicial;

        // Cancelar créditos anteriores si se sumaron
        if (aplicarSaldoAnterior && creditoAnterior && creditoAnterior.length > 0) {
          const idsAnteriores = creditoAnterior.map(c => c.id);

          await supabase
            .from('creditos')
            .update({
              estado: 'cancelado',
              observaciones: `Unificado en factura ${numeroFactura}`
            })
            .in('id', idsAnteriores);
        }

        let estadoCredito = 'activo';
        if (saldoPendiente <= 0) estadoCredito = 'pagado';

        const creditoData = {
          cliente_id: clienteIdFinal,
          venta_id: ventaIdPrincipal,
          fecha_inicio: new Date().toISOString(),
          fecha_fin: fechaVencimiento,
          monto_total: totalFacturaConSaldo,
          monto_pagado: abonoInicial,
          saldo_pendiente: saldoPendiente,
          estado: estadoCredito,
          observaciones: aplicarSaldoAnterior 
            ? `Incluye saldo anterior de C$${saldoAAgregar.toFixed(2)}` 
            : null
        };

        const { data: creditoInsertado, error: errCredito } = await supabase
          .from('creditos')
          .insert([creditoData])
          .select();

        if (errCredito) {
          setError('Venta guardada, pero error al crear crédito: ' + errCredito.message);
        } else if (abonoInicial > 0 && creditoInsertado && creditoInsertado.length > 0) {
          const creditoId = creditoInsertado[0].id;
          
          let metodoAbono = 'efectivo';
          const metodosAbono = [];
          if (efectivoNum > 0) metodosAbono.push('efectivo');
          if (tarjetaNum > 0) metodosAbono.push('tarjeta');
          if (transferenciaNum > 0) metodosAbono.push('transferencia');
          
          if (metodosAbono.length === 1) metodoAbono = metodosAbono[0];
          else if (metodosAbono.length > 1) metodoAbono = 'mixto';

          await supabase
            .from('abonos_credito')
            .insert([{
              credito_id: creditoId,
              monto: abonoInicial,
              metodo_pago: metodoAbono,
              banco: banco || null,
              fecha: new Date().toISOString(),
              observaciones: 'Abono inicial al momento de la venta'
            }]);
        }
      }

      setNumeroFacturaVer(numeroFactura);
      setModalVerFactura(true);
      
      setExito(`✅ Venta registrada - Factura: ${numeroFactura}`);
      setTimeout(() => setExito(null), 4000);

      // ===== ALERTA DE STOCK BAJO TRAS LA VENTA =====
      await revisarStockTrasVenta(idsVendidos);

      setLineasVenta([]);
      setClienteSeleccionado('general');
      setMetodoPago('contado');
      setBanco('');
      setFechaVencimiento('');
      setEfectivo('');
      setTarjeta('');
      setTransferencia('');
      setVuelto('0.00');
      setSaldoAnterior(0);
      setCreditoAnterior(null);
      setSumarSaldoAnterior(true);

    } catch (err) {
      console.error('❌ Error guardando venta:', err);
      
      let mensajeError = 'Error al guardar la venta';
      if (err.code === '23505') {
        mensajeError = 'Conflicto: número de factura duplicado. Intenta de nuevo.';
      } else if (err.message) {
        mensajeError += ': ' + err.message;
      }
      
      setError(mensajeError);
      setTimeout(() => setError(null), 5000);
    } finally {
      setGuardando(false);
    }
  };

  const handleVerFactura = (numeroFactura) => {
    setNumeroFacturaVer(numeroFactura);
    setModalVerFactura(true);
  };

  const totalProductosNuevos = lineasVenta.reduce((sum, l) => sum + l.total, 0);
  const aplicarSaldo = metodoPago === 'credito' && saldoAnterior > 0 && sumarSaldoAnterior;
  const totalFinal = totalProductosNuevos + (aplicarSaldo ? saldoAnterior : 0);

  return (
    <div className="ventas-container">
      <Encabezado />

      <div className="ventas-content">
        <div className="ventas-header">
          <div className="ventas-titulo">
            <h1>🛒 Ventas</h1>
            <p>Registro de ventas de la carnicería</p>
          </div>

          <div className="header-actions">
            <button
              className="btn-facturas-dia"
              onClick={() => setModalFacturasDia(true)}
            >
              <i className="fas fa-receipt"></i> Facturas del Día
            </button>
          </div>
        </div>

        {error && (
          <div className="ventas-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {exito && (
          <div className="ventas-exito">
            <i className="fas fa-check-circle"></i>
            <span>{exito}</span>
            <button onClick={() => setExito(null)} className="exito-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* ===== ALERTA DE STOCK BAJO TRAS LA VENTA ===== */}
        {alertasStock.length > 0 && (
          <div className="alerta-stock-venta">
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <strong>Atención: poco stock después de esta venta</strong>
              <ul>
                {alertasStock.map((aviso, i) => (
                  <li key={i}>{aviso}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setAlertasStock([])} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {saldoAnterior > 0 && metodoPago === 'credito' && (
          <div className="aviso-saldo-anterior">
            <div className="aviso-saldo-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="aviso-saldo-content">
              <h4>⚠️ Este cliente tiene saldo pendiente</h4>
              <p>
                <strong>{clientes.find(c => c.id === parseInt(clienteSeleccionado))?.nombre}</strong> tiene un saldo pendiente de <strong>C${saldoAnterior.toFixed(2)}</strong>
                {creditoAnterior && creditoAnterior.length > 1 && ` (${creditoAnterior.length} créditos activos)`}
              </p>
              <label className="aviso-saldo-checkbox">
                <input
                  type="checkbox"
                  checked={sumarSaldoAnterior}
                  onChange={(e) => setSumarSaldoAnterior(e.target.checked)}
                />
                <span>
                  <strong>Sumar este saldo a la nueva factura</strong>
                  <small>Si desmarcas, el saldo anterior quedará como crédito separado</small>
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="ventas-layout">
          {/* ===== IZQUIERDA: PRODUCTOS DE LA VENTA ===== */}
          <section className="ventas-col-productos">
        <TablaVenta
          lineasVenta={lineasVenta}
          setLineasVenta={setLineasVenta}
          onAbrirModalAgregar={() => {
            cargarStock(); // stock fresco cada vez que se abre el selector
            setModalAgregarProducto(true);
          }}
        />

          </section>

          {/* ===== DERECHA: COBRO (siempre visible) ===== */}
          <aside className="ventas-col-cobro">
        <FormularioVenta
          clientes={clientes}
          clienteSeleccionado={clienteSeleccionado}
          setClienteSeleccionado={setClienteSeleccionado}
          metodoPago={metodoPago}
          setMetodoPago={setMetodoPago}
          banco={banco}
          setBanco={setBanco}
          fechaVencimiento={fechaVencimiento}
          setFechaVencimiento={setFechaVencimiento}
          efectivo={efectivo}
          setEfectivo={setEfectivo}
          tarjeta={tarjeta}
          setTarjeta={setTarjeta}
          transferencia={transferencia}
          setTransferencia={setTransferencia}
          vuelto={vuelto}
          setVuelto={setVuelto}
          totalVenta={totalProductosNuevos}
        />


        {lineasVenta.length > 0 && (
          <div className="ventas-acciones">
            <div className="resumen-total">
              {aplicarSaldo ? (
                <>
                  <div className="resumen-linea">
                    <span>Productos nuevos:</span>
                    <strong>C${totalProductosNuevos.toFixed(2)}</strong>
                  </div>
                  <div className="resumen-linea resumen-saldo-anterior">
                    <span>Saldo anterior:</span>
                    <strong>C${saldoAnterior.toFixed(2)}</strong>
                  </div>
                  <div className="resumen-linea resumen-total-final">
                    <span>TOTAL A PAGAR:</span>
                    <strong>C${totalFinal.toFixed(2)}</strong>
                  </div>
                </>
              ) : (
                <>
                  <span>Total:</span>
                  <strong>C${totalProductosNuevos.toFixed(2)}</strong>
                </>
              )}
            </div>
            <button
              className="btn-guardar-venta"
              onClick={guardarVenta}
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> Guardar Venta
                </>
              )}
            </button>
          </div>
        )}
          </aside>
        </div>
      </div>

      <ModalAgregarProductoVenta
        isOpen={modalAgregarProducto}
        onClose={() => setModalAgregarProducto(false)}
        productos={productos || []}
        onAgregar={agregarProductoDesdeModal}
        preciosCliente={preciosCliente}
        stockDisponible={stockMapa}
      />

      <ModalFacturasDia
        isOpen={modalFacturasDia}
        onClose={() => setModalFacturasDia(false)}
        onVerFactura={handleVerFactura}
      />

      <ModalVerFactura
        isOpen={modalVerFactura}
        onClose={() => setModalVerFactura(false)}
        numeroFactura={numeroFacturaVer}
      />
    </div>
  );
}

export default Ventas;
