import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// ===== ALMACENAMIENTO LOCAL =====
const CLAVE_COLA_VENTAS = 'ventas_pendientes_sync';
const CLAVE_CLIENTES = 'clientes_cache';
const CLAVE_STOCK = 'stock_mapa_cache';

const leerJSON = (clave, defecto) => {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : defecto;
  } catch {
    return defecto;
  }
};

const leerCola = () => leerJSON(CLAVE_COLA_VENTAS, []);
const guardarCola = (cola) => localStorage.setItem(CLAVE_COLA_VENTAS, JSON.stringify(cola));

const notificarStock = () => {
  try {
    Promise.resolve(notificarCambioStock()).catch(() => {});
  } catch (e) {
    console.warn('No se pudo notificar el cambio de stock', e);
  }
};

const procesarPaquete = async (pkg) => {
  // 1. Filas de la venta
  if (!pkg.ventaInsertada) {
    // Limpiamos datos nulos o indefinidos para evitar error 400
    const filasLimpias = pkg.filasVenta.map(f => ({
      producto_id: f.producto_id,
      cliente_id: f.cliente_id || null,
      cantidad: f.cantidad,
      precio_unitario: f.precio_unitario,
      total: f.total,
      metodo_pago: f.metodo_pago,
      banco: f.banco || null,
      efectivo: f.efectivo || 0,
      tarjeta: f.tarjeta || 0,
      transferencia: f.transferencia || 0,
      vuelto: f.vuelto || 0,
      estado: f.estado,
      numero_factura: f.numero_factura,
      usuario: f.usuario || 'Admin',
      fecha: f.fecha
    }));

    const { data, error } = await supabase.from('ventas').insert(filasLimpias).select();
    if (error) throw error;
    pkg.ventaId = data && data.length > 0 ? data[0].id : null;
    pkg.ventaInsertada = true;
  }

  if (!pkg.credito) return;

  // 2. Cancelar créditos anteriores que se unificaron en esta factura
  if (pkg.idsCancelar && pkg.idsCancelar.length > 0 && !pkg.canceladosHecho) {
    const { error } = await supabase
      .from('creditos')
      .update({ estado: 'cancelado', observaciones: `Unificado en factura ${pkg.numeroFactura}` })
      .in('id', pkg.idsCancelar);
    if (error) throw error;
    pkg.canceladosHecho = true;
  }

  // 3. Crédito (con datos limpios y el venta_id real)
  if (!pkg.creditoId) {
    // Aseguramos que la fecha_fin no sea vacía (causa del error 400)
    let fechaFinValida = pkg.credito.fecha_fin;
    if (!fechaFinValida || fechaFinValida === '') {
      const hoy = new Date();
      hoy.setDate(hoy.getDate() + 8);
      fechaFinValida = hoy.toISOString().split('T')[0];
    }

    const creditoLimpio = {
      cliente_id: pkg.credito.cliente_id,
      venta_id: pkg.ventaId || null,
      fecha_inicio: pkg.credito.fecha_inicio || new Date().toISOString(),
      fecha_fin: fechaFinValida,
      monto_total: pkg.credito.monto_total || 0,
      monto_pagado: pkg.credito.monto_pagado || 0,
      saldo_pendiente: pkg.credito.saldo_pendiente || 0,
      estado: pkg.credito.estado || 'activo',
      observaciones: pkg.credito.observaciones || null
    };

    const { data, error } = await supabase
      .from('creditos')
      .insert([creditoLimpio])
      .select();
      
    if (error) {
      console.error("Error exacto al insertar crédito:", error);
      throw error;
    }
    pkg.creditoId = data && data.length > 0 ? data[0].id : null;
  }

  // 4. Abono inicial (con datos limpios)
  if (pkg.abono && !pkg.abonoInsertado) {
    if (!pkg.creditoId) throw new Error('No se obtuvo el id del crédito');
    
    const abonoLimpio = {
      credito_id: pkg.creditoId,
      monto: pkg.abono.monto || 0,
      metodo_pago: pkg.abono.metodo_pago || 'efectivo',
      banco: pkg.abono.banco || null,
      fecha: pkg.abono.fecha || new Date().toISOString(),
      observaciones: pkg.abono.observaciones || null
    };

    const { error } = await supabase
      .from('abonos_credito')
      .insert([abonoLimpio]);
    if (error) {
      console.error("Error exacto al insertar abono:", error);
      throw error;
    }
    pkg.abonoInsertado = true;
  }
};
function Ventas() {
  const navigate = useNavigate();

  // ===== DATOS =====
  const { data: productos } = useRealtimeSync('productos', 'productos_cache');
  const [clientes, setClientes] = useState([]);

  // ===== STOCK DISPONIBLE =====
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

  // ===== MENSAJES Y CONEXIÓN =====
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [conectado, setConectado] = useState(navigator.onLine);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const sincronizandoRef = useRef(false);

  // ===== HOOK PRECIOS POR CLIENTE =====
  const { preciosCliente } = usePreciosCliente(clienteSeleccionado);

  // ===== STOCK (con caché para offline) =====
  const cargarStock = useCallback(async () => {
    if (!navigator.onLine) {
      const cache = leerJSON(CLAVE_STOCK, {});
      setStockMapa(cache);
      return cache;
    }
    try {
      const mapa = await obtenerMapaStock();
      setStockMapa(mapa);
      localStorage.setItem(CLAVE_STOCK, JSON.stringify(mapa));
      return mapa;
    } catch (err) {
      console.warn('No se pudo cargar el stock, se usa el caché');
      const cache = leerJSON(CLAVE_STOCK, {});
      setStockMapa(cache);
      return cache;
    }
  }, []);

  // ===== SINCRONIZAR VENTAS PENDIENTES =====
  const sincronizarPendientes = useCallback(async (manual = false) => {
    if (!navigator.onLine) {
      if (manual) setError('Sin internet');
      return;
    }
    if (sincronizandoRef.current) return;

    const cola = leerCola();
    if (cola.length === 0) {
      if (manual) {
        setExito('✅ Todo sincronizado');
        setTimeout(() => setExito(null), 3000);
      }
      return;
    }

    sincronizandoRef.current = true;
    setSincronizando(true);

    const okIds = new Set();
    const fallidos = new Map();

    try {
      for (const pkg of cola) {
        try {
          await procesarPaquete(pkg);
          okIds.add(pkg.id_local);
        } catch (err) {
          console.warn('⚠️ No se pudo sincronizar la venta', pkg.numeroFactura, err);
          pkg.ultimoError = err?.message || String(err);
          fallidos.set(pkg.id_local, pkg); // conserva el progreso ya hecho
        }
      }
    } finally {
      // Se relee la cola por si se guardó otra venta mientras sincronizaba
      const nuevaCola = leerCola()
        .filter(p => !okIds.has(p.id_local))
        .map(p => fallidos.get(p.id_local) || p);

      guardarCola(nuevaCola);
      setOperacionesPendientes(nuevaCola.length);
      sincronizandoRef.current = false;
      setSincronizando(false);
    }

    if (okIds.size > 0) {
      setExito(`✅ ${okIds.size} venta(s) sincronizada(s)`);
      setTimeout(() => setExito(null), 4000);
      notificarStock();
      await cargarStock();
    }
    if (fallidos.size > 0) {
      setError(`⚠️ ${fallidos.size} venta(s) no se pudieron sincronizar. Se reintentará automáticamente.`);
      setTimeout(() => setError(null), 5000);
    }
  }, [cargarStock]);

  // ===== CONEXIÓN + STOCK INICIAL + SINCRONIZAR AL VOLVER EL INTERNET =====
  useEffect(() => {
    cargarStock();

    const handleOnline = () => {
      setConectado(true);
      sincronizarPendientes();
    };
    const handleOffline = () => setConectado(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Si hay pendientes de una sesión anterior y ya hay internet, se envían
    if (navigator.onLine) sincronizarPendientes();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cargarStock, sincronizarPendientes]);

  // ===== CONTAR PENDIENTES (y reintentar si hay internet) =====
  useEffect(() => {
    const revisar = () => {
      const cola = leerCola();
      setOperacionesPendientes(cola.length);
      if (cola.length > 0 && navigator.onLine) sincronizarPendientes();
    };
    revisar();
    const interval = setInterval(revisar, 15000);
    return () => clearInterval(interval);
  }, [sincronizarPendientes]);

  // ===== CLIENTES (con caché para offline) =====
  useEffect(() => {
    const cargarClientes = async () => {
      if (!navigator.onLine) {
        setClientes(leerJSON(CLAVE_CLIENTES, []));
        return;
      }
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nombre')
          .order('nombre');

        if (error) throw error;
        setClientes(data || []);
        localStorage.setItem(CLAVE_CLIENTES, JSON.stringify(data || []));
      } catch (err) {
        console.error('Error cargando clientes:', err);
        setClientes(leerJSON(CLAVE_CLIENTES, []));
      }
    };
    cargarClientes();
  }, [conectado]);

  useEffect(() => {
    const buscarSaldoAnterior = async () => {
      setSaldoAnterior(0);
      setCreditoAnterior(null);

      if (!clienteSeleccionado || clienteSeleccionado === 'general' || !conectado) return;

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
  }, [clienteSeleccionado, conectado]);

  useEffect(() => {
    if (metodoPago === 'credito') {
      const hoy = new Date();
      hoy.setDate(hoy.getDate() + 8);
      setFechaVencimiento(hoy.toISOString().split('T')[0]);
    } else {
      setFechaVencimiento('');
    }
  }, [metodoPago]);

  useEffect(() => {
    setEfectivo('');
    setTarjeta('');
    setTransferencia('');
    setVuelto('0.00');
    setBanco('');
  }, [metodoPago]);

  const generarNumeroFactura = async () => {
    const hoy = new Date();
    const fechaStr = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;

    try {
      if (!navigator.onLine) {
        return `OFF-${fechaStr}-${Date.now().toString().slice(-4)}`;
      }

      const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0).toISOString();
      const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('ventas')
        .select('numero_factura')
        .gte('fecha', inicioDia)
        .lte('fecha', finDia);

      if (error) throw error;

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
      console.error('Error generando número, se usa uno offline:', err);
      return `OFF-${fechaStr}-${Date.now().toString().slice(-4)}`;
    }
  };

  const agregarProductoDesdeModal = (nuevaLinea) => {
    setLineasVenta(prev => {
      const existe = prev.find(l => l.producto_id === nuevaLinea.producto_id);
      if (existe) {
        return prev.map(l => l.producto_id === nuevaLinea.producto_id ? { ...l, cantidad: nuevaLinea.cantidad, precio_unitario: nuevaLinea.precio_unitario, total: nuevaLinea.total } : l);
      } else {
        return [...prev, nuevaLinea];
      }
    });
  };

  const revisarStockTrasVenta = async (idsVendidos) => {
    if (!navigator.onLine) return;
    try {
      const avisos = await avisosStockTrasVenta(idsVendidos);
      setAlertasStock(avisos);
      if (avisos.length > 0) setTimeout(() => setAlertasStock([]), 15000);
      notificarStock();
      await cargarStock();
    } catch (err) {
      console.error('Error revisando stock tras la venta:', err);
    }
  };

  // Resta del stock local lo vendido offline, para que las siguientes ventas avisen bien
  const descontarStockLocal = (lineas) => {
    setStockMapa(prev => {
      const nuevo = { ...prev };
      lineas.forEach(l => {
        const s = nuevo[l.producto_id];
        if (s) {
          nuevo[l.producto_id] = {
            ...s,
            stock_disponible: Number(s.stock_disponible || 0) - Number(l.cantidad || 0)
          };
        }
      });
      localStorage.setItem(CLAVE_STOCK, JSON.stringify(nuevo));
      return nuevo;
    });
  };

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

      // Advertencia de stock: con internet usa el dato fresco, sin internet usa el caché local
      try {
        const stockFresco = navigator.onLine ? await obtenerMapaStock() : leerJSON(CLAVE_STOCK, {});
        const insuficientes = lineasVenta.filter(l => {
          const s = stockFresco[l.producto_id];
          return s && Number(l.cantidad) > s.stock_disponible;
        });

        if (insuficientes.length > 0) {
          const detalle = insuficientes.map(l => {
            const s = stockFresco[l.producto_id];
            return `• ${s.nombre}: vendes ${Number(l.cantidad).toFixed(2)} y hay ${Math.max(0, s.stock_disponible).toFixed(2)} ${s.unidad_medida || ''}`;
          }).join('\n');
          const continuar = window.confirm(`⚠️ Stock insuficiente según el inventario:\n\n${detalle}\n\n¿Guardar la venta de todas formas?`);
          if (!continuar) return;
        }
      } catch (e) {
        console.warn('No se pudo verificar el stock, probablemente sin internet.');
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
      const fechaVentaISO = new Date().toISOString();

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
        usuario: 'Admin',
        fecha: fechaVentaISO
      }));

      // ===== PAQUETE COMPLETO DE LA VENTA (venta + crédito + abono) =====
      const paquete = {
        id_local: `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        numeroFactura,
        timestamp: fechaVentaISO,
        filasVenta,
        credito: null,
        abono: null,
        idsCancelar: [],
        ventaInsertada: false,
        ventaId: null,
        canceladosHecho: false,
        creditoId: null,
        abonoInsertado: false
      };

      if (metodoPago === 'credito' && clienteIdFinal) {
        const abonoInicial = totalPagado;
        const saldoPendiente = totalFacturaConSaldo - abonoInicial;

        paquete.credito = {
          cliente_id: clienteIdFinal,
          fecha_inicio: fechaVentaISO,
          fecha_fin: fechaVencimiento,
          monto_total: totalFacturaConSaldo,
          monto_pagado: abonoInicial,
          saldo_pendiente: saldoPendiente,
          estado: saldoPendiente <= 0 ? 'pagado' : 'activo',
          observaciones: aplicarSaldoAnterior ? `Incluye saldo anterior de C$${saldoAAgregar.toFixed(2)}` : null
        };

        if (abonoInicial > 0) {
          paquete.abono = {
            monto: abonoInicial,
            metodo_pago: metodoPagoBD,
            banco: banco || null,
            fecha: fechaVentaISO,
            observaciones: 'Abono inicial al momento de la venta'
          };
        }

        if (aplicarSaldoAnterior && creditoAnterior && creditoAnterior.length > 0) {
          paquete.idsCancelar = creditoAnterior.map(c => c.id);
        }
      }

      // ===== INTENTAR GUARDAR EN SUPABASE; SI FALLA O NO HAY INTERNET, A LA COLA LOCAL =====
      let guardadoExitoso = false;

      if (navigator.onLine) {
        try {
          await procesarPaquete(paquete);
          guardadoExitoso = true;
        } catch (errorRed) {
          console.warn('⚠️ Falló el guardado en Supabase. Se guarda localmente...', errorRed);
          paquete.ultimoError = errorRed?.message || String(errorRed);
        }
      }

      if (!guardadoExitoso) {
        const cola = leerCola();
        cola.push(paquete);
        guardarCola(cola);
        setOperacionesPendientes(cola.length);
        descontarStockLocal(lineasVenta);

        setExito(`📝 Venta guardada localmente - Factura: ${numeroFactura}. Se sincronizará con internet.`);
        setTimeout(() => setExito(null), 5000);
      } else {
        setExito(`✅ Venta registrada - Factura: ${numeroFactura}`);
        setTimeout(() => setExito(null), 4000);
        setNumeroFacturaVer(numeroFactura);
        setModalVerFactura(true);
        await revisarStockTrasVenta(lineasVenta.map(l => l.producto_id));
      }

      // Limpiar formulario
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
      setError('Error inesperado al guardar la venta.');
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

          {/* ESTADO DE CONEXIÓN */}
          <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className={`status-indicator ${conectado ? 'online' : 'offline'}`} style={{ fontSize: '13px', color: conectado ? '#059669' : '#dc2626' }}>
              <i className={`fas ${conectado ? 'fa-wifi' : 'fa-wifi-slash'}`}></i>
              {conectado ? ' En línea' : ' Sin conexión'}
            </span>
            {operacionesPendientes > 0 && (
              <span className="pendientes-indicator" style={{ fontSize: '13px', color: '#d97706' }}>
                <i className="fas fa-clock"></i> {operacionesPendientes} pendientes
              </span>
            )}
            {operacionesPendientes > 0 && (
              <button
                className="btn-sincronizar"
                onClick={() => sincronizarPendientes(true)}
                disabled={!conectado || sincronizando}
              >
                <i className={`fas fa-sync ${sincronizando ? 'fa-spin' : ''}`}></i> Sincronizar
              </button>
            )}
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
                cargarStock();
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
