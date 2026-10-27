import React, { useState, useEffect } from 'react';
import './TablaCreditos.css';

const TablaCreditos = ({ creditos, loading, onEditar, onEliminar, getEstadoCredito }) => {
  const [creditosAgrupados, setCreditosAgrupados] = useState({});
  const [clientesExpandidos, setClientesExpandidos] = useState({});
  const [busqueda, setBusqueda] = useState('');
  
  const [filtroEstado, setFiltroEstado] = useState('pendientes'); 

  // Color principal del sistema (Ajusta este código HEX si tu rojo es un poco más claro u oscuro)
  const COLOR_SISTEMA = '#9b1c1c'; 

  useEffect(() => {
    if (creditos && creditos.length > 0) {
      const termino = busqueda.toLowerCase().trim();
      
      let creditosFiltrados = creditos.filter(credito => {
        if (!termino) return true;
        const nombreCliente = (credito.cliente_nombre || '').toLowerCase();
        const idCredito = String(credito.id);
        return nombreCliente.includes(termino) || idCredito.includes(termino);
      });

      const agrupados = {};
      
      creditosFiltrados.forEach(credito => {
        const nombreRaw = credito.cliente_nombre || 'Sin nombre';
        const clienteClave = nombreRaw.toLowerCase().trim();
        
        if (!agrupados[clienteClave]) {
          agrupados[clienteClave] = {
            cliente: nombreRaw,
            creditos: [],
            totalGeneral: 0,
            saldoGeneral: 0,
            expandido: termino ? true : (clientesExpandidos[clienteClave] || false)
          };
        }
        
        agrupados[clienteClave].creditos.push(credito);
        agrupados[clienteClave].totalGeneral += parseFloat(credito.monto_total || 0);
        agrupados[clienteClave].saldoGeneral += parseFloat(credito.saldo_pendiente || 0);
      });

      const agrupadosFiltrados = Object.entries(agrupados).reduce((acc, [clave, datos]) => {
        if (filtroEstado === 'pendientes' && datos.saldoGeneral > 0) {
          acc[clave] = datos;
        } else if (filtroEstado === 'completados' && datos.saldoGeneral <= 0) {
          acc[clave] = datos;
        } else if (filtroEstado === 'todos') {
          acc[clave] = datos;
        }
        return acc;
      }, {});

      setCreditosAgrupados(agrupadosFiltrados);
    } else {
      setCreditosAgrupados({});
    }
  }, [creditos, clientesExpandidos, busqueda, filtroEstado]);

  const toggleExpandirCliente = (clienteClave) => {
    setClientesExpandidos(prev => ({
      ...prev,
      [clienteClave]: !prev[clienteClave]
    }));
  };

  const totalPendientes = creditos.filter(c => Number(c.saldo_pendiente || 0) > 0).length;
  const totalCompletados = creditos.filter(c => Number(c.saldo_pendiente || 0) <= 0).length;
  const totalTodos = creditos.length;

  if (loading) {
    return (
      <div className="tabla-creditos-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando créditos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tabla-creditos-container">
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
        
        {/* BARRA DE PESTAÑAS (Filtros con color del sistema) */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <button 
            onClick={() => setFiltroEstado('pendientes')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '8px', border: `1px solid ${filtroEstado === 'pendientes' ? COLOR_SISTEMA : '#e5e7eb'}`, cursor: 'pointer',
              backgroundColor: filtroEstado === 'pendientes' ? COLOR_SISTEMA : '#ffffff',
              color: filtroEstado === 'pendientes' ? '#ffffff' : '#374151',
              fontWeight: 'bold', transition: 'all 0.2s'
            }}
          >
            Pendientes 
            <span style={{ 
              backgroundColor: filtroEstado === 'pendientes' ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
              padding: '2px 8px', borderRadius: '12px', fontSize: '12px'
            }}>{totalPendientes}</span>
          </button>

          <button 
            onClick={() => setFiltroEstado('completados')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '8px', border: `1px solid ${filtroEstado === 'completados' ? COLOR_SISTEMA : '#e5e7eb'}`, cursor: 'pointer',
              backgroundColor: filtroEstado === 'completados' ? COLOR_SISTEMA : '#ffffff',
              color: filtroEstado === 'completados' ? '#ffffff' : '#374151',
              fontWeight: 'bold', transition: 'all 0.2s'
            }}
          >
            Completados 
            <span style={{ 
              backgroundColor: filtroEstado === 'completados' ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
              padding: '2px 8px', borderRadius: '12px', fontSize: '12px'
            }}>{totalCompletados}</span>
          </button>

          <button 
            onClick={() => setFiltroEstado('todos')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '8px', border: `1px solid ${filtroEstado === 'todos' ? COLOR_SISTEMA : '#e5e7eb'}`, cursor: 'pointer',
              backgroundColor: filtroEstado === 'todos' ? COLOR_SISTEMA : '#ffffff',
              color: filtroEstado === 'todos' ? '#ffffff' : '#374151',
              fontWeight: 'bold', transition: 'all 0.2s'
            }}
          >
            Todos 
            <span style={{ 
              backgroundColor: filtroEstado === 'todos' ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
              padding: '2px 8px', borderRadius: '12px', fontSize: '12px'
            }}>{totalTodos}</span>
          </button>

          {/* Botón de Eliminar Completados con el color del sistema */}
          <button 
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: '#ef4444', color: '#ffffff', fontWeight: 'bold' // Rojo brillante para indicar peligro/eliminación
            }}
          >
            <i className="fas fa-trash"></i> Eliminar Completados
            <span style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              {totalCompletados}
            </span>
          </button>
        </div>

        {/* BUSCADOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
            <input
              type="text"
              placeholder="Buscar por cliente o número de crédito..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px',
                border: '1px solid #d1d5db', outline: 'none', fontSize: '14px'
              }}
            />
          </div>
          {busqueda && (
            <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* TABLA (Se mantiene igual) */}
      <div className="tabla-scroll">
        <table className="tabla-creditos">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Cliente</th>
              <th style={{ width: '15%' }}>Total</th>
              <th style={{ width: '15%' }}>Saldo</th>
              <th style={{ width: '15%' }}>Estado</th>
              <th style={{ width: '25%' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(creditosAgrupados).length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                  No se encontraron créditos {filtroEstado !== 'todos' ? filtroEstado : ''}
                </td>
              </tr>
            ) : (
              Object.entries(creditosAgrupados).map(([clienteClave, datos]) => {
                const expandido = datos.expandido;

                return (
                  <React.Fragment key={clienteClave}>
                    <tr 
                      onClick={() => toggleExpandirCliente(clienteClave)}
                      style={{ cursor: 'pointer', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}
                    >
                      <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', width: '15px' }}>
                          {expandido ? '▼' : '▶'}
                        </span>
                        <strong>{datos.cliente}</strong>
                        <span style={{ backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', color: '#374151' }}>
                          {datos.creditos.length} crédito{datos.creditos.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>
                        C${datos.totalGeneral.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: datos.saldoGeneral > 0 ? '#d97706' : '#059669', fontWeight: 'bold' }}>
                          C${datos.saldoGeneral.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge-estado-resumen ${datos.saldoGeneral > 0 ? 'pendiente' : 'completado'}`}>
                          {datos.saldoGeneral > 0 ? 'Pendiente' : 'Completado'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#3b82f6', fontSize: '13px' }}>
                        {expandido ? 'Ocultar detalles' : 'Ver detalles'}
                      </td>
                    </tr>
                    
                    {expandido && datos.creditos.map((credito) => {
                      const estado = getEstadoCredito ? getEstadoCredito(credito) : { texto: 'Activo', clase: 'activo' };

                      return (
                        <tr key={credito.id} style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 10px 10px 35px', color: '#6b7280' }}>
                            └─ ID Crédito: #{credito.id}
                          </td>
                          <td style={{ padding: '10px' }}>
                            C${parseFloat(credito.monto_total || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ color: parseFloat(credito.saldo_pendiente) > 0 ? '#d97706' : '#059669' }}>
                              C${parseFloat(credito.saldo_pendiente || 0).toFixed(2)}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span className={`badge-estado ${estado.clase}`}>{estado.texto}</span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); onEditar(credito); }}
                                style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                title="Editar"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onEliminar(credito); }}
                                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                title="Eliminar"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TablaCreditos;