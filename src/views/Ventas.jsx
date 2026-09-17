import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import FormularioVenta from '../components/ventas/FormularioVenta';
import TablaVenta from '../components/ventas/TablaVenta';
import ModalFacturasDia from '../components/ventas/ModalFacturasDia';
import ModalVerFactura from '../components/ventas/ModalVerFactura';
import usePreciosCliente from '../hooks/usePreciosCliente';
import './Ventas.css';

function Ventas() {
  const navigate = useNavigate();

  // ===== DATOS =====
  const { data: productos } = useRealtimeSync('productos', 'productos_cache');
  const [clientes, setClientes] = useState([]);

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

  // ===== MODALES =====
  const [modalFacturasDia, setModalFacturasDia] = useState(false);
  const [modalVerFactura, setModalVerFactura] = useState(false);
  const [numeroFacturaVer, setNumeroFacturaVer] = useState('');

  // ===== MENSAJES =====
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // ===== HOOK PRECIOS POR CLIENTE =====
  const { preciosCliente } = usePreciosCliente(clienteSeleccionado);

  // ===== CARGAR CLIENTES =====
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nombre')
          .order('nombre');
        
        if (error) {
          console.error('Error cargando clientes:', error);
          return;
        }
        
        setClientes(data || []);
      } catch (err) {
        console.error('Error:', err);
      }
    };
    cargarClientes();
  }, []);

  // ===== FECHA VENCIMIENTO POR DEFECTO (8 DÍAS) =====
  useEffect(() => {
    if (metodoPago === 'credito') {
      const hoy = new Date();
      hoy.setDate(hoy.getDate() + 8);
      setFechaVencimiento(hoy.toISOString().split('T')[0]);
    } else {
      setFechaVencimiento('');
    }
  }, [metodoPago]);

  // ===== LIMPIAR CAMPOS DE PAGO CUANDO CAMBIA EL MÉTODO =====
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

      if (error) {
        console.error('Error obteniendo último número:', error);
      }

      let correlativo = 1;
      if (data && data.length > 0) {
        const correlativos = data
          .map(v => {
            const partes = v.numero_factura?.split('-');
            if (partes && partes.length === 2) {
              return parseInt(partes[1]) || 0;
            }
            return 0;
          })
          .filter(n => n > 0);
        
        if (correlativos.length > 0) {
          correlativo = Math.max(...correlativos) + 1;
        }
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

      const totalVenta = lineasVenta.reduce((sum, l) => sum + l.total, 0);
      const efectivoNum = parseFloat(efectivo) || 0;
      const tarjetaNum = parseFloat(tarjeta) || 0;
      const transferenciaNum = parseFloat(transferencia) || 0;
      const vueltoNum = parseFloat(vuelto) || 0;
      const totalPagado = efectivoNum + tarjetaNum + transferenciaNum;

      // Validación CONTADO
      if (metodoPago === 'contado' && totalPagado < totalVenta) {
        setError(`El total pagado (C$${totalPagado.toFixed(2)}) es menor al total de la venta (C$${totalVenta.toFixed(2)})`);
        setTimeout(() => setError(null), 5000);
        return;
      }

      setGuardando(true);

      const numeroFactura = await generarNumeroFactura();
      const clienteIdFinal = clienteSeleccionado === 'general' ? null : parseInt(clienteSeleccionado);

      // ===== 1. DETERMINAR METODO_PAGO VÁLIDO PARA LA BD =====
      let metodoPagoBD = 'efectivo';
      
      if (metodoPago === 'credito') {
        metodoPagoBD = 'credito';
      } else {
        const metodosConMonto = [];
        if (efectivoNum > 0) metodosConMonto.push('efectivo');
        if (tarjetaNum > 0) metodosConMonto.push('tarjeta');
        if (transferenciaNum > 0) metodosConMonto.push('transferencia');
        
        if (metodosConMonto.length === 0) {
          metodoPagoBD = 'efectivo';
        } else if (metodosConMonto.length === 1) {
          metodoPagoBD = metodosConMonto[0];
        } else {
          metodoPagoBD = 'mixto';
        }
      }

      // ===== 2. DETERMINAR ESTADO VÁLIDO =====
      const estadoBD = metodoPago === 'credito' ? 'credito' : 'completada';

      // ===== 3. INSERTAR EN VENTAS =====
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

      console.log('📝 Insertando en ventas:', filasVenta);

      const { data: ventasInsertadas, error: errVenta } = await supabase
        .from('ventas')
        .insert(filasVenta)
        .select();

      if (errVenta) {
        console.error('❌ Error insertando ventas:', errVenta);
        throw errVenta;
      }

      console.log('✅ Ventas insertadas:', ventasInsertadas);

      // ===== 4. SI ES CRÉDITO, INSERTAR TAMBIÉN EN CREDITOS =====
      if (metodoPago === 'credito' && clienteIdFinal) {
        
        // Obtener el ID de la venta principal
        let ventaIdPrincipal = null;
        
        if (ventasInsertadas && ventasInsertadas.length > 0 && ventasInsertadas[0].id) {
          ventaIdPrincipal = ventasInsertadas[0].id;
        } else {
          console.log('⚠️ Buscando ID de venta por numero_factura...');
          const { data: ventaBuscada } = await supabase
            .from('ventas')
            .select('id')
            .eq('numero_factura', numeroFactura)
            .limit(1)
            .maybeSingle();
          
          if (ventaBuscada) {
            ventaIdPrincipal = ventaBuscada.id;
          }
        }

        console.log('📌 ID de venta para vincular crédito:', ventaIdPrincipal);

        // ===== CALCULAR ABONO Y SALDO =====
        const abonoInicial = totalPagado;
        const saldoPendiente = totalVenta - abonoInicial;

        console.log('💰 Total:', totalVenta, '| Abono:', abonoInicial, '| Saldo:', saldoPendiente);

        // Estado del crédito
        let estadoCredito = 'activo';
        if (saldoPendiente <= 0) {
          estadoCredito = 'pagado';
        }

        const creditoData = {
          cliente_id: clienteIdFinal,
          venta_id: ventaIdPrincipal,
          fecha_inicio: new Date().toISOString(),
          fecha_fin: fechaVencimiento,
          monto_total: totalVenta,
          monto_pagado: abonoInicial,           // ✅ AHORA SÍ GUARDA EL ABONO
          saldo_pendiente: saldoPendiente,       // ✅ AHORA SÍ CALCULA EL SALDO
          estado: estadoCredito
        };

        console.log('📝 Insertando en creditos:', creditoData);

        const { data: creditoInsertado, error: errCredito } = await supabase
          .from('creditos')
          .insert([creditoData])
          .select();

        if (errCredito) {
          console.error('❌ Error al registrar crédito:', errCredito);
          setError('Venta guardada, pero error al crear crédito: ' + errCredito.message);
        } else {
          console.log('✅ Crédito registrado:', creditoInsertado);

          // ===== 5. SI HAY ABONO INICIAL, TAMBIÉN REGISTRAR EN abonos_credito =====
          if (abonoInicial > 0 && creditoInsertado && creditoInsertado.length > 0) {
            const creditoId = creditoInsertado[0].id;
            
            // Determinar método del abono
            let metodoAbono = 'efectivo';
            const metodosAbono = [];
            if (efectivoNum > 0) metodosAbono.push('efectivo');
            if (tarjetaNum > 0) metodosAbono.push('tarjeta');
            if (transferenciaNum > 0) metodosAbono.push('transferencia');
            
            if (metodosAbono.length === 1) metodoAbono = metodosAbono[0];
            else if (metodosAbono.length > 1) metodoAbono = 'mixto';

            const abonoData = {
              credito_id: creditoId,
              monto: abonoInicial,
              metodo_pago: metodoAbono,
              banco: banco || null,
              fecha: new Date().toISOString(),
              observaciones: 'Abono inicial al momento de la venta'
            };

            console.log('📝 Insertando abono inicial en abonos_credito:', abonoData);

            const { error: errAbono } = await supabase
              .from('abonos_credito')
              .insert([abonoData]);

            if (errAbono) {
              console.error('❌ Error al registrar abono inicial:', errAbono);
            } else {
              console.log('✅ Abono inicial registrado');
            }
          }
        }
      }

      // ===== 6. ABRIR LA FACTURA AUTOMÁTICAMENTE =====
      setNumeroFacturaVer(numeroFactura);
      setModalVerFactura(true);
      
      setExito(`✅ Venta registrada - Factura: ${numeroFactura}`);
      setTimeout(() => setExito(null), 4000);

      // ===== 7. LIMPIAR FORMULARIO =====
      setLineasVenta([]);
      setClienteSeleccionado('general');
      setMetodoPago('contado');
      setBanco('');
      setFechaVencimiento('');
      setEfectivo('');
      setTarjeta('');
      setTransferencia('');
      setVuelto('0.00');

    } catch (err) {
      console.error('❌ Error guardando venta:', err);
      console.error('Detalles:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      
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

  // ===== ABRIR VER FACTURA =====
  const handleVerFactura = (numeroFactura) => {
    setNumeroFacturaVer(numeroFactura);
    setModalVerFactura(true);
  };

  // ===== TOTAL =====
  const totalVenta = lineasVenta.reduce((sum, l) => sum + l.total, 0);

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
          totalVenta={totalVenta}
        />

        <TablaVenta
          productos={productos || []}
          lineasVenta={lineasVenta}
          setLineasVenta={setLineasVenta}
          preciosCliente={preciosCliente}
        />

        {lineasVenta.length > 0 && (
          <div className="ventas-acciones">
            <div className="resumen-total">
              <span>Total:</span>
              <strong>C${totalVenta.toFixed(2)}</strong>
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
      </div>

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