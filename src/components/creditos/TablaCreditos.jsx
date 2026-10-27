import React, { useState, useEffect } from 'react';
import './TablaCreditos.css';

const TablaCreditos = ({ creditos, loading, onEditar, onEliminar, getEstadoCredito }) => {
  const [creditosAgrupados, setCreditosAgrupados] = useState({});
  const [clientesExpandidos, setClientesExpandidos] = useState({});

  // Agrupar créditos por cliente
  useEffect(() => {
    if (creditos && creditos.length > 0) {
      const agrupados = {};
      
      creditos.forEach(credito => {
        const nombreRaw = credito.cliente_nombre || 'Sin nombre';
        const clienteClave = nombreRaw.toLowerCase().trim();
        
        if (!agrupados[clienteClave]) {
          agrupados[clienteClave] = {
            cliente: nombreRaw,
            creditos: [],
            totalGeneral: 0,
            saldoGeneral: 0,
            expandido: clientesExpandidos[clienteClave] || false
          };
        }
        
        agrupados[clienteClave].creditos.push(credito);
        agrupados[clienteClave].totalGeneral += parseFloat(credito.monto_total || 0);
        agrupados[clienteClave].saldoGeneral += parseFloat(credito.saldo_pendiente || 0);
      });
      
      setCreditosAgrupados(agrupados);
    } else {
      setCreditosAgrupados({});
    }
  }, [creditos, clientesExpandidos]);

  const toggleExpandirCliente = (clienteClave) => {
    setClientesExpandidos(prev => ({
      ...prev,
      [clienteClave]: !prev[clienteClave]
    }));
  };

  const formatFecha = (fechaISO) => {
    if (!fechaISO) return 'Fecha no disponible';
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
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                  No hay créditos registrados
                </td>
              </tr>
            ) : (
              Object.entries(creditosAgrupados).map(([clienteClave, datos]) => {
                const expandido = datos.expandido;

                return (
                  <React.Fragment key={clienteClave}>
                    {/* FILA DEL CLIENTE (RESUMEN) */}
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
                    
                    {/* FILAS DE DETALLES DEL CLIENTE (EXPANDIDAS) */}
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