import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Encabezado from '../components/Encabezado';
import useRealtimeSync from '../hooks/useRealtimeSync';
import './Inicio.css';

function Inicio() {
  const navigate = useNavigate();
  const { esAdmin } = useAuth();  // ← NUEVO
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({
    ventasHoy: 0,
    ventasRealizadas: 0,
    pendientes: 0
  });

  const { 
    data: ventas, 
    conectado,
    sincronizar,
    loading: syncLoading
  } = useRealtimeSync('ventas', 'ventas_cache');

  useEffect(() => {
    if (ventas.length > 0 || !syncLoading) {
      calcularResumen();
    }
  }, [ventas, syncLoading]);

  const calcularResumen = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const ventasHoy = ventas.filter(v => v.fecha === hoy);
    
    const totalVentas = ventasHoy?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
    const ventasRealizadas = ventasHoy?.filter(v => v.estado === 'completada').length || 0;
    const pendientes = ventasHoy?.filter(v => v.estado === 'pendiente').length || 0;

    setResumen({
      ventasHoy: totalVentas,
      ventasRealizadas: ventasRealizadas,
      pendientes: pendientes
    });
    setLoading(false);
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
            <button className="btn-sincronizar" onClick={sincronizar} disabled={!conectado}>
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
              onClick={() => navigate(modulo.ruta)}
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
            <div className="resumen-card">
              <div className="resumen-icon" style={{ background: '#2e7d32' }}>
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="resumen-info">
                <span className="resumen-label">Ventas del día</span>
                <span className="resumen-valor">
                  {loading ? 'Cargando...' : `C$ ${resumen.ventasHoy.toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="resumen-card">
              <div className="resumen-icon" style={{ background: '#1565c0' }}>
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div className="resumen-info">
                <span className="resumen-label">Ventas realizadas</span>
                <span className="resumen-valor">
                  {loading ? 'Cargando...' : resumen.ventasRealizadas}
                </span>
              </div>
            </div>

            <div className="resumen-card">
              <div className="resumen-icon" style={{ background: '#c62828' }}>
                <i className="fas fa-clock"></i>
              </div>
              <div className="resumen-info">
                <span className="resumen-label">Pendientes</span>
                <span className="resumen-valor">
                  {loading ? 'Cargando...' : resumen.pendientes}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inicio;