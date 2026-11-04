import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import './TarjetasResultadoProductos.css';

const TarjetasResultadoProductos = ({ version }) => {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Utilidades de formato
  const formatoMoneda = (valor) => {
    return `C$${Number(valor || 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatoCantidad = (valor) => {
    return Number(valor || 0).toLocaleString('es-NI', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        // 1. Obtener inversiones agrupadas por producto
        const { data: inversiones, error: invError } = await supabase
          .from('inversiones')
          .select('producto_id, monto, cantidad, precio_unitario, productos(nombre, unidad_medida)');

        if (invError) throw invError;

        // 2. Obtener ventas agrupadas por producto
        const { data: ventas, error: venError } = await supabase
          .from('ventas')
          .select('producto_id, cantidad, total');

        if (venError) throw venError;

        // 3. Procesar y agrupar datos
        const agrupado = {};

        // Procesar Inversiones
        (inversiones || []).forEach(inv => {
          if (!inv.producto_id) return;
          const pid = inv.producto_id;
          if (!agrupado[pid]) {
            agrupado[pid] = {
              producto_id: pid,
              nombre: inv.productos?.nombre || 'Desconocido',
              unidad: inv.productos?.unidad_medida || '',
              invertido: 0,
              comprado: 0,
              vendido: 0,
              ingresos: 0
            };
          }
          agrupado[pid].invertido += Number(inv.monto || 0);
          agrupado[pid].comprado += Number(inv.cantidad || 0);
        });

        // Procesar Ventas
        (ventas || []).forEach(ven => {
          if (!ven.producto_id) return;
          const pid = ven.producto_id;
          if (!agrupado[pid]) {
            agrupado[pid] = {
              producto_id: pid,
              nombre: 'Desconocido',
              unidad: '',
              invertido: 0,
              comprado: 0,
              vendido: 0,
              ingresos: 0
            };
          }
          agrupado[pid].vendido += Number(ven.cantidad || 0);
          agrupado[pid].ingresos += Number(ven.total || 0);
        });

        // 4. Calcular métricas finales
        const resultado = Object.values(agrupado).map(item => {
          const costoPorUnidad = item.comprado > 0 ? item.invertido / item.comprado : 0;
          const quedaPorVender = Math.max(0, item.comprado - item.vendido);
          const valorQueda = quedaPorVender * costoPorUnidad;
          
          const costoDeLoVendido = item.vendido * costoPorUnidad;
          const balance = item.ingresos - costoDeLoVendido;
          
          const porcentajeRecuperado = item.invertido > 0 ? (item.ingresos / item.invertido) * 100 : 0;

          return {
            ...item,
            costoPorUnidad,
            quedaPorVender,
            valorQueda,
            balance,
            porcentajeRecuperado
          };
        });

        resultado.sort((a, b) => a.balance - b.balance);

        setDatos(resultado);
      } catch (error) {
        console.error('Error cargando tarjetas de resultados:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [version]);

  const handleEditar = (productoId) => {
    // Redirige a Inversiones pasando el ID del producto para que lo filtre
    navigate(`/inversiones?editar_producto=${productoId}`);
  };

  const handleEliminar = async (productoId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar TODAS las inversiones de este producto? Esta acción no se puede deshacer.')) {
      try {
        const { error } = await supabase
          .from('inversiones')
          .delete()
          .eq('producto_id', productoId);

        if (error) throw error;
        
        // Recargar datos
        setDatos(prev => prev.filter(d => d.producto_id !== productoId));
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar las inversiones');
      }
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Cargando...</div>;
  if (datos.length === 0) return null;

  return (
    <div className="tarjetas-horizontal-container">
      {datos.map((item) => {
        const esPerdida = item.balance < 0;
        const colorEstado = esPerdida ? '#ef4444' : '#10b981'; 
        const colorFondoEstado = esPerdida ? '#fee2e2' : '#d1fae5'; 

        return (
          <div className="tarjeta-fila" key={item.producto_id}>
            
            {/* Lado Izquierdo: Nombre y Estado */}
            <div className="tarjeta-fila-izq">
              <div className="tarjeta-fila-header">
                <span className="tarjeta-fila-titulo">{item.nombre}</span>
                <span 
                  className="tarjeta-fila-badge"
                  style={{ color: colorEstado, backgroundColor: colorFondoEstado }}
                >
                  {esPerdida ? '↘ PÉRDIDA' : '↗ GANANCIA'}
                </span>
              </div>
              
              <div className="tarjeta-fila-datos">
                <span><strong>Inv:</strong> {formatoMoneda(item.invertido)}</span>
                <span><strong>Costo:</strong> {formatoMoneda(item.costoPorUnidad)}/{item.unidad || 'u'}</span>
              </div>
            </div>

            {/* Centro: Barra de Progreso */}
            <div className="tarjeta-fila-centro">
              <div className="tarjeta-fila-progreso-textos">
                <span>Recuperado: {item.porcentajeRecuperado.toFixed(1)}%</span>
                <span>Vendido: {formatoCantidad(item.vendido)} / {formatoCantidad(item.comprado)} {item.unidad}</span>
              </div>
              <div className="tarjeta-progreso-barra-fondo">
                <div 
                  className="tarjeta-progreso-barra-fill" 
                  style={{ 
                    width: `${Math.min(100, Math.max(0, item.porcentajeRecuperado))}%`,
                    backgroundColor: item.porcentajeRecuperado >= 100 ? '#10b981' : '#f59e0b'
                  }}
                ></div>
              </div>
            </div>

            {/* Lado Derecho: Balance y Acciones */}
            <div className="tarjeta-fila-der">
              <div className="tarjeta-fila-balance-grupo">
                <div className="tarjeta-fila-balance-label">BALANCE</div>
                <div className="tarjeta-fila-balance-monto" style={{ color: colorEstado }}>
                  {esPerdida ? '-' : '+'}{formatoMoneda(Math.abs(item.balance))}
                </div>
              </div>
              
              <div className="tarjeta-fila-acciones">
                <button 
                  className="btn-accion editar" 
                  onClick={() => handleEditar(item.producto_id)}
                  title="Editar Inversiones"
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button 
                  className="btn-accion eliminar" 
                  onClick={() => handleEliminar(item.producto_id)}
                  title="Eliminar Inversiones"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};

export default TarjetasResultadoProductos;