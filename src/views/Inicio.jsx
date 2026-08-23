import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import './Inicio.css';

function Inicio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({
    ventasHoy: 0,
    ventasRealizadas: 0,
    pendientes: 0
  });

  // ===== CARGAR DATOS DEL DASHBOARD =====
  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  const cargarDatosDashboard = async () => {
    try {
      setLoading(true);
      
      // Obtener fecha actual
      const hoy = new Date().toISOString().split('T')[0];

      // Ventas del día
      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas')
        .select('total, estado')
        .eq('fecha', hoy);

      if (ventasError) throw ventasError;

      // Calcular total de ventas del día
      const totalVentas = ventasData?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
      const ventasRealizadas = ventasData?.filter(v => v.estado === 'completada').length || 0;
      const pendientes = ventasData?.filter(v => v.estado === 'pendiente').length || 0;

      setResumen({
        ventasHoy: totalVentas,
        ventasRealizadas: ventasRealizadas,
        pendientes: pendientes
      });

    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Módulos del menú
  const modulos = [
    { 
      id: 'productos', 
      nombre: 'Productos', 
      icono: 'fa-box', 
      color: '#e74c3c',
      ruta: '/productos'
    },
    { 
      id: 'inventario', 
      nombre: 'Inventario', 
      icono: 'fa-warehouse', 
      color: '#f39c12',
      ruta: '/inventario'
    },
    { 
      id: 'ventas', 
      nombre: 'Ventas', 
      icono: 'fa-cash-register', 
      color: '#2ecc71',
      ruta: '/ventas'
    },
    { 
      id: 'creditos', 
      nombre: 'Créditos', 
      icono: 'fa-hand-holding-usd', 
      color: '#3498db',
      ruta: '/creditos'
    },
    { 
      id: 'abonos', 
      nombre: 'Abonos', 
      icono: 'fa-coins', 
      color: '#1abc9c',
      ruta: '/abonos'
    },
    { 
      id: 'gastos', 
      nombre: 'Gastos', 
      icono: 'fa-receipt', 
      color: '#e74c3c',
      ruta: '/gastos'
    },
    { 
      id: 'arqueos', 
      nombre: 'Arqueos', 
      icono: 'fa-calculator', 
      color: '#9b59b6',
      ruta: '/arqueos'
    },
    { 
      id: 'reportes', 
      nombre: 'Reportes', 
      icono: 'fa-chart-bar', 
      color: '#34495e',
      ruta: '/reportes'
    },
    { 
      id: 'servicios', 
      nombre: 'Servicios', 
      icono: 'fa-concierge-bell', 
      color: '#e67e22',
      ruta: '/servicios'
    },
    { 
      id: 'inversiones', 
      nombre: 'Inversiones', 
      icono: 'fa-chart-line', 
      color: '#2c3e50',
      ruta: '/inversiones'
    }
  ];

  return (
    <div className="inicio-container">
      {/* Encabezado */}
      <header className="inicio-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">🥩</div>
            <div className="logo-text">
              <h1>CARNICERÍA</h1>
              <span>URBINA</span>
            </div>
          </div>
          <div className="user-section">
            <i className="fas fa-user-circle"></i>
            <span>Administrador</span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="inicio-content">
        {/* Bienvenida */}
        <div className="welcome-section">
          <div className="welcome-text">
            <h2>¡Bienvenido!</h2>
            <p>Carnicería Urbina</p>
            <span>Sistema de gestión de inventario y ventas</span>
          </div>
        </div>

        {/* Módulos */}
        <div className="modulos-grid">
          {modulos.map((modulo) => (
            <div 
              key={modulo.id}
              className="modulo-card"
              onClick={() => navigate(modulo.ruta)}
              style={{ borderLeftColor: modulo.color }}
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

        {/* Resumen general */}
        <div className="resumen-section">
          <h3>Resumen general</h3>
          <div className="resumen-cards">
            <div className="resumen-card">
              <div className="resumen-icon" style={{ background: '#2ecc71' }}>
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
              <div className="resumen-icon" style={{ background: '#3498db' }}>
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
              <div className="resumen-icon" style={{ background: '#e74c3c' }}>
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

      {/* Navegación inferior */}
      <div className="bottom-nav">
        <button className="nav-item active">
          <i className="fas fa-home"></i>
          <span>Inicio</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/productos')}>
          <i className="fas fa-box"></i>
          <span>Productos</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/ventas')}>
          <i className="fas fa-cash-register"></i>
          <span>Ventas</span>
        </button>
        <button className="nav-item">
          <i className="fas fa-ellipsis-h"></i>
          <span>Más</span>
        </button>
      </div>
    </div>
  );
}

export default Inicio;