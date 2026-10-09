import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import { useAuth } from '../context/AuthContext';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import './Inicio.css';

// Estados que no cuentan como venta
const ESTADOS_EXCLUIDOS = ['anulada', 'cancelada'];

// Rango del día de hoy en hora LOCAL (igual que se usa en Ventas.jsx)
const rangoHoy = () => {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
};

const formatearMonto = (n) =>
  new Intl.NumberFormat('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n || 0);

/**
 * La tabla ventas guarda UNA FILA POR PRODUCTO, así que:
 *  - Ventas del día     = suma de los totales de todas las filas de hoy
 *  - Ventas realizadas  = facturas distintas (numero_factura), no filas
 *  - Pendientes         = facturas a crédito de hoy (estado 'credito')
 */
const calcularResumen = (lista) => {
  const validas = (lista || []).filter(v => !ESTADOS_EXCLUIDOS.includes(v.estado));

  const ventasHoy = validas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);

  const facturas = new Map();
  validas.forEach(v => {
    const clave = v.numero_factura || `id_${v.id}`;
    if (!facturas.has(clave)) facturas.set(clave, v.estado);
  });

  let pendientes = 0;
  facturas.forEach(estado => {
    if (estado === 'credito') pendientes += 1;
  });

  return {
    ventasHoy,
    ventasRealizadas: facturas.size,
    pendientes
  };
};

function Inicio() {
  const navigate = useNavigate();
  const { esAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({
    ventasHoy: 0,
    ventasRealizadas: 0,
    pendientes: 0
  });

  const { 
    data: ventas, 
    conectado,
    sincronizar
  } = useRealtimeSync('ventas', 'ventas_cache');

  // Copia de las ventas en caché, usada solo si no hay conexión
  const ventasRef = useRef(ventas);
  ventasRef.current = ventas;

  // ===== CARGAR RESUMEN DEL DÍA =====
  const cargarResumen = useCallback(async () => {
    const { inicio, fin } = rangoHoy();

    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('id, numero_factura, total, estado, fecha')
        .gte('fecha', inicio.toISOString())
        .lt('fecha', fin.toISOString());

      if (error) throw error;
      setResumen(calcularResumen(data));
    } catch (err) {
      // Sin conexión: se calcula con las ventas guardadas en caché
      const delDia = (ventasRef.current || []).filter(v => {
        const f = new Date(v.fecha);
        return f >= inicio && f < fin;
      });
      setResumen(calcularResumen(delDia));
    } finally {
      setLoading(false);
    }
  }, []);

  // Al abrir la pantalla + actualización en tiempo real + respaldo cada minuto
  useEffect(() => {
    cargarResumen();

    const canal = supabase
      .channel(`inicio_ventas_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, cargarResumen)
      .subscribe();

    const intervalo = setInterval(cargarResumen, 60000);

    return () => {
      clearInterval(intervalo);
      supabase.removeChannel(canal);
    };
  }, [cargarResumen]);

  // Cuando cambia la caché de ventas (sincronización), se recalcula
  useEffect(() => {
    cargarResumen();
  }, [ventas, cargarResumen]);

  const handleSincronizar = async () => {
    await sincronizar();
    await cargarResumen();
  };

  // ===== MÓDULOS CON PERMISOS =====
  const todosLosModulos = [
    { id: 'productos',   nombre: 'Productos',   icono: 'fa-box',              color: '#8B1E1E', ruta: '/productos',   soloAdmin: false },
    { id: 'inventario',  nombre: 'Inventario',  icono: 'fa-warehouse',        color: '#FBAC3E', ruta: '/inventario',  soloAdmin: true  },
    { id: 'ventas',      nombre: 'Ventas',      icono: 'fa-cash-register',    color: '#2e7d32', ruta: '/ventas',      soloAdmin: false },
    { id: 'creditos',    nombre: 'Créditos',    icono: 'fa-hand-holding-usd', color: '#1565c0', ruta: '/creditos',    soloAdmin: false },
    { id: 'abonos',      nombre: 'Abonos',      icono: 'fa-coins',            color: '#00897b', ruta: '/abonos',      soloAdmin: false },
    { id: 'gastos',      nombre: 'Gastos',      icono: 'fa-receipt',          color: '#c62828', ruta: '/gastos',      soloAdmin: true  },
    { id: 'arqueos',     nombre: 'Arqueos',     icono: 'fa-calculator',       color: '#6a1b9a', ruta: '/arqueos',     soloAdmin: true  },
    { id: 'reportes',    nombre: 'Reportes',    icono: 'fa-chart-bar',        color: '#37474f', ruta: '/reportes',    soloAdmin: true  },
    { id: 'clientes',    nombre: 'Clientes',    icono: 'fa-users',            color: '#00838f', ruta: '/clientes',    soloAdmin: false },
    { id: 'inversiones', nombre: 'Inversiones', icono: 'fa-chart-line',       color: '#1a237e', ruta: '/inversiones', soloAdmin: true  }
  ];

  // Filtrar según rol
  const modulos = todosLosModulos.filter(m => esAdmin || !m.soloAdmin);

  // ===== TARJETAS DE RESUMEN (cada una lleva a su pantalla) =====
  const tarjetasResumen = [
    {
      id: 'ventas-dia',
      label: 'Ventas del día',
      valor: `C$ ${formatearMonto(resumen.ventasHoy)}`,
      icono: 'fa-dollar-sign',
      color: '#2e7d32',
      ruta: '/ventas',
      ayuda: 'Total vendido hoy (contado y crédito)'
    },
    {
      id: 'ventas-realizadas',
      label: 'Ventas realizadas',
      valor: resumen.ventasRealizadas,
      icono: 'fa-shopping-cart',
      color: '#1565c0',
      ruta: '/ventas',
      ayuda: 'Facturas emitidas hoy'
    },
    {
      id: 'pendientes',
      label: 'Pendientes',
      valor: resumen.pendientes,
      icono: 'fa-clock',
      color: '#c62828',
      ruta: '/creditos',
      ayuda: 'Facturas a crédito de hoy'
    }
  ];

  const alPresionarTecla = (e, ruta) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(ruta);
    }
  };

  return (
    <div className="inicio-container">
      <Encabezado />

      <div className="inicio-content">
        <div className="inicio-header">
          <div className="inicio-titulo">
          </div>
          <div className="header-actions">
            <span className={`status-indicator ${conectado ? 'online' : 'offline'}`}>
              <i className={`fas ${conectado ? 'fa-wifi' : 'fa-wifi-slash'}`}></i>
              {conectado ? ' En línea' : ' Sin conexión'}
            </span>
            <button className="btn-sincronizar" onClick={handleSincronizar} disabled={!conectado}>
              <i className="fas fa-sync"></i> Sincronizar
            </button>
          </div>
        </div>

        <div className="welcome-section">
          <div className="welcome-text">
            <h2>¡Bienvenido!</h2>
            <p>Carnicería Urbina</p>
            <span>Sistema de gestión de inventario y ventas</span>
          </div>
        </div>

        <div className="modulos-grid">
          {modulos.map((modulo) => (
            <div 
              key={modulo.id}
              className="modulo-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(modulo.ruta)}
              onKeyDown={(e) => alPresionarTecla(e, modulo.ruta)}
            >
              <div className="modulo-icon" style={{ background: modulo.color }}>
                <i className={`fas ${modulo.icono}`}></i>
              </div>
              <div className="modulo-info">
                <h3>{modulo.nombre}</h3>
                <span>Gestionar</span>
              </div>
              <div className="modulo-arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          ))}
        </div>

        <div className="resumen-section">
          <h3>Resumen general</h3>
          <div className="resumen-cards">
            {tarjetasResumen.map((t) => (
              <div
                key={t.id}
                className="resumen-card resumen-card-click"
                role="button"
                tabIndex={0}
                title={t.ayuda}
                onClick={() => navigate(t.ruta)}
                onKeyDown={(e) => alPresionarTecla(e, t.ruta)}
              >
                <div className="resumen-icon" style={{ background: t.color }}>
                  <i className={`fas ${t.icono}`}></i>
                </div>
                <div className="resumen-info">
                  <span className="resumen-label">{t.label}</span>
                  <span className="resumen-valor">
                    {loading ? 'Cargando...' : t.valor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inicio;
