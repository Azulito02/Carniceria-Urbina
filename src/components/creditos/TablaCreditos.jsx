import React, { useState, useEffect } from 'react';
import './TablaCreditos.css';

const TablaCreditos = ({ creditos, loading, onEditar, onEliminar, getEstadoCredito }) => {
  const [creditosAgrupados, setCreditosAgrupados] = useState({});
  const [clientesExpandidos, setClientesExpandidos] = useState({});
  const [busqueda, setBusqueda] = useState('');
  
  const [filtroEstado, setFiltroEstado] = useState('pendientes'); 

  const COLOR_SISTEMA = '#9b1c1c'; 

  // 🔥 FORMATEO DE FECHAS (Ajustado a Nicaragua UTC-6)
  const formatFechaNicaragua = (fechaISO) => {
    if (!fechaISO) return 'Sin fecha';
    try {
      const fechaUTC = new Date(fechaISO);
      const fechaNic = new Date(fechaUTC.getTime() - (6 * 60 * 60 * 1000));
      const d = fechaNic.getDate().toString().padStart(2, '0');
      const m = (fechaNic.getMonth() + 1).toString().padStart(2, '0');
      const y = fechaNic.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return fechaISO;
    }
  };

  const formatSoloFecha = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    try {
      const fecha = new Date(fechaStr.replace(/-/g, '\/').replace(/T.+/, ''));
      const d = fecha.getDate().toString().padStart(2, '0');
      const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const y = fecha.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return fechaStr;
    }
  };

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
        <div className="loading-container" style={{ textAlign: 'center', padding: '50px' }}>
          <div className="spinner"></div>
          <p>Cargando créditos...</p>
        </div>
      </div>
    );
  }

  // 🔥 COMPONENTE DE TARJETAS PARA MÓVIL
  const renderMobileCards = () => {
    return Object.entries(creditosAgrupados).map(([clienteClave, datos]) => (
      <div key={clienteClave} style={{ 
        backgroundColor: '#fff', 
        borderRadius: '10px', 
        marginBottom: '15px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        {/* CABECERA DEL CLIENTE */}
        <div 
          onClick={() => toggleExpandirCliente(clienteClave)}
          style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: '#f9fafb', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '16px', color: '#1f2937' }}>{datos.cliente}</strong>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{datos.creditos.length} créditos</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Saldo</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d97706' }}>C${datos.saldoGeneral.toFixed(2)}</div>
          </div>
        </div>

        {/* DETALLES (Si está expandido) */}
        {datos.expandido && (
          <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {datos.creditos.map(credito => {
              const estado = getEstadoCredito ? getEstadoCredito(credito) : { texto: 'Activo', clase: 'activo' };
              return (
                <div key={credito.id} style={{ borderBottom: '1px dashed #e5e7eb', paddingBottom: '10px', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Crédito #{credito.id}</span>
                    <span className={`badge-estado ${estado.clase}`}>{estado.texto}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '13px', color: '#4b5563' }}>
                    <div><strong>Registro:</strong> {formatFechaNicaragua(credito.fecha_inicio || credito.created_at)}</div>
                    <div><strong>Vence:</strong> {formatSoloFecha(credito.fecha_fin)}</div>
                    <div><strong>Total:</strong> C${parseFloat(credito.monto_total || 0).toFixed(2)}</div>
                    <div><strong>Saldo:</strong> C${parseFloat(credito.saldo_pendiente || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button onClick={() => onEditar(credito)} style={{ flex: 1, background: '#f59e0b', color: 'white', border: 'none', padding: '8px', borderRadius: '5px' }}>Editar</button>
                    <button onClick={() => onEliminar(credito)} style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '8px', borderRadius: '5px' }}>Eliminar</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="tabla-creditos-container">
      
      {/* CONTROLES (Filtros y Buscador) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setFiltroEstado('pendientes')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${filtroEstado === 'pendientes' ? COLOR_SISTEMA : '#e5e7eb'}`, backgroundColor: filtroEstado === 'pendientes' ? COLOR_SISTEMA : '#ffffff', color: filtroEstado === 'pendientes' ? '#ffffff' : '#374151', fontWeight: 'bold', cursor: 'pointer' }}>
            Pendientes <span style={{ backgroundColor: filtroEstado === 'pendientes' ? 'rgba(255,255,255,0.2)' : '#f3f4f6', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{totalPendientes}</span>
          </button>
          <button onClick={() => setFiltroEstado('completados')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${filtroEstado === 'completados' ? COLOR_SISTEMA : '#e5e7eb'}`, backgroundColor: filtroEstado === 'completados' ? COLOR_SISTEMA : '#ffffff', color: filtroEstado === 'completados' ? '#ffffff' : '#374151', fontWeight: 'bold', cursor: 'pointer' }}>
            Completados <span style={{ backgroundColor: filtroEstado === 'completados' ? 'rgba(255,255,255,0.2)' : '#f3f4f6', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{totalCompletados}</span>
          </button>
          <button onClick={() => setFiltroEstado('todos')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${filtroEstado === 'todos' ? COLOR_SISTEMA : '#e5e7eb'}`, backgroundColor: filtroEstado === 'todos' ? COLOR_SISTEMA : '#ffffff', color: filtroEstado === 'todos' ? '#ffffff' : '#374151', fontWeight: 'bold', cursor: 'pointer' }}>
            Todos <span style={{ backgroundColor: filtroEstado === 'todos' ? 'rgba(255,255,255,0.2)' : '#f3f4f6', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{totalTodos}</span>
          </button>
          <button style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
            <i className="fas fa-trash"></i> <span className="desktop-only-text">Eliminar Completados</span>
            <span style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{totalCompletados}</span>
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
          <input type="text" placeholder="Buscar por cliente o número de crédito..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px' }} />
        </div>
      </div>

      {/* 🔥 VISTA ESCRITORIO (TABLA) */}
      <div className="tabla-scroll desktop-only">
        <table className="tabla-creditos">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Cliente / Registro</th>
              <th style={{ width: '15%' }}>Total</th>
              <th style={{ width: '15%' }}>Saldo</th>
              <th style={{ width: '15%' }}>Vencimiento</th>
              <th style={{ width: '10%' }}>Estado</th>
              <th style={{ width: '15%' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(creditosAgrupados).length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No se encontraron créditos</td></tr>
            ) : (
              Object.entries(creditosAgrupados).map(([clienteClave, datos]) => (
                <React.Fragment key={clienteClave}>
                  {/* FILA DEL CLIENTE (RESUMEN) */}
                  <tr onClick={() => toggleExpandirCliente(clienteClave)} style={{ cursor: 'pointer', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', width: '15px' }}>{datos.expandido ? '▼' : '▶'}</span>
                        <strong>{datos.cliente}</strong>
                        <span style={{ backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{datos.creditos.length} créditos</span>
                      </div>
                      {/* 🔥 AQUÍ AGREGAMOS LA FECHA DE REGISTRO EN LA FILA DEL CLIENTE */}
                      {datos.creditos.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '25px' }}>
                          📅 Registro: {formatFechaNicaragua(datos.creditos[0].fecha_inicio || datos.creditos[0].created_at)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>C${datos.totalGeneral.toFixed(2)}</td>
                    <td style={{ padding: '12px' }}><span style={{ color: datos.saldoGeneral > 0 ? '#d97706' : '#059669', fontWeight: 'bold' }}>C${datos.saldoGeneral.toFixed(2)}</span></td>
                    <td style={{ padding: '12px' }}>{datos.creditos.length > 0 ? formatSoloFecha(datos.creditos[0].fecha_fin) : '-'}</td>
                    <td style={{ padding: '12px' }}><span className={`badge-estado-resumen ${datos.saldoGeneral > 0 ? 'pendiente' : 'completado'}`}>{datos.saldoGeneral > 0 ? 'Pendiente' : 'Completado'}</span></td>
                    <td style={{ padding: '12px', color: '#3b82f6', fontSize: '13px' }}>{datos.expandido ? 'Ocultar' : 'Ver detalles'}</td>
                  </tr>
                  
                  {/* FILAS DE DETALLES (Créditos individuales) */}
                  {datos.expandido && datos.creditos.map((credito) => {
                    const estado = getEstadoCredito ? getEstadoCredito(credito) : { texto: 'Activo', clase: 'activo' };
                    return (
                      <tr key={credito.id} style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 10px 10px 35px', color: '#4b5563' }}>
                          <div>└─ #{credito.id}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>📅 {formatFechaNicaragua(credito.fecha_inicio || credito.created_at)}</div>
                        </td>
                        <td style={{ padding: '10px' }}>C${parseFloat(credito.monto_total || 0).toFixed(2)}</td>
                        <td style={{ padding: '10px' }}><span style={{ color: parseFloat(credito.saldo_pendiente) > 0 ? '#d97706' : '#059669' }}>C${parseFloat(credito.saldo_pendiente || 0).toFixed(2)}</span></td>
                        <td style={{ padding: '10px' }}>{formatSoloFecha(credito.fecha_fin)}</td>
                        <td style={{ padding: '10px' }}><span className={`badge-estado ${estado.clase}`}>{estado.texto}</span></td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => onEditar(credito)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}><i className="fas fa-edit"></i></button>
                            <button onClick={() => onEliminar(credito)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}><i className="fas fa-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 🔥 VISTA MÓVIL (TARJETAS) */}
      <div className="mobile-only">
        {Object.keys(creditosAgrupados).length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No se encontraron créditos</p>
        ) : (
          renderMobileCards()
        )}
      </div>

    </div>
  );
};

export default TablaCreditos;