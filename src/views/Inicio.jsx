import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';
import './Inicio.css';

function Inicio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({
    ventasHoy: 0,
    ventasRealizadas: 0,
    pendientes: 0
  });

  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  const cargarDatosDashboard = async () => {
    try {
      setLoading(true);
      const hoy = new Date().toISOString().split('T')[0];

      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas')
        .select('total, estado')
        .eq('fecha', hoy);

      if (ventasError) throw ventasError;

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

  const modulos = [
    { id: 'productos', nombre: 'Productos', icono: 'fa-box', color: '#8B1E1E', ruta: '/productos' },
    { id: 'inventario', nombre: 'Inventario', icono: 'fa-warehouse', color: '#FBAC3E', ruta: '/inventario' },
    { id: 'ventas', nombre: 'Ventas', icono: 'fa-cash-register', color: '#2e7d32', ruta: '/ventas' },
    { id: 'creditos', nombre: 'Créditos', icono: 'fa-hand-holding-usd', color: '#1565c0', ruta: '/creditos' },
    { id: 'abonos', nombre: 'Abonos', icono: 'fa-coins', color: '#00897b', ruta: '/abonos' },
    { id: 'gastos', nombre: 'Gastos', icono: 'fa-receipt', color: '#c62828', ruta: '/gastos' },
    { id: 'arqueos', nombre: 'Arqueos', icono: 'fa-calculator', color: '#6a1b9a', ruta: '/arqueos' },
    { id: 'reportes', nombre: 'Reportes', icono: 'fa-chart-bar', color: '#37474f', ruta: '/reportes' },
    { id: 'clientes', nombre: 'Clientes', icono: 'fa-users', color: '#00838f', ruta: '/clientes' }, // ← CAMBIADO
    { id: 'inversiones', nombre: 'Inversiones', icono: 'fa-chart-line', color: '#1a237e', ruta: '/inversiones' }
  ];

  // Navegación inferior
  const navItems = [
    { id: 'inicio', icono: 'fa-home', label: 'Inicio', ruta: '/' },
    { id: 'productos', icono: 'fa-box', label: 'Productos', ruta: '/productos' },
    { id: 'inventario', icono: 'fa-warehouse', label: 'Inventario', ruta: '/inventario' },
    { id: 'ventas', icono: 'fa-cash-register', label: 'Ventas', ruta: '/ventas' },
    { id: 'mas', icono: 'fa-ellipsis-h', label: 'Más', ruta: '/mas' }
  ];

  return (
    <div className="inicio-container">
      <Encabezado />

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

      {/* Navegación inferior - CORREGIDA */}
      <div className="bottom-nav">
        {navItems.map((item) => (
          <button 
            key={item.id}
            className={`nav-item ${item.id === 'inicio' ? 'active' : ''}`} 
            onClick={() => navigate(item.ruta)}
          >
            <i className={`fas ${item.icono}`}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Inicio;