import React, { useState, useEffect } from 'react';
import { supabase } from '../../database/supabase';
import PDFFactura from './PDFFactura';
import './ModalVerFactura.css';

const ModalVerFactura = ({ isOpen, onClose, numeroFactura }) => {
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  useEffect(() => {
    if (isOpen && numeroFactura) {
      cargarFactura();
    }
  }, [isOpen, numeroFactura]);

  const cargarFactura = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          productos (nombre, marca, unidad_medida),
          clientes (nombre, direccion)
        `)
        .eq('numero_factura', numeroFactura)
        .order('id');

      if (error) throw error;

      if (data && data.length > 0) {
        const primera = data[0];
        const total = data.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);

        let creditoInfo = null;
        if (primera.metodo_pago === 'credito' && primera.cliente_id) {
          const ventaIdPrincipal = primera.id;
          const { data: credito } = await supabase
            .from('creditos')
            .select('*')
            .eq('venta_id', ventaIdPrincipal)
            .maybeSingle();
          
          creditoInfo = credito;
        }

        // Detectar saldo anterior
        let saldoAnteriorIncluido = 0;
        if (creditoInfo?.observaciones) {
          const match = creditoInfo.observaciones.match(/saldo anterior de C\$([\d.]+)/i);
          if (match && match[1]) {
            saldoAnteriorIncluido = parseFloat(match[1]);
          }
        }

        const totalProductosNuevos = creditoInfo 
          ? parseFloat(creditoInfo.monto_total) - saldoAnteriorIncluido
          : total;

        setFactura({
          numero_factura: numeroFactura,
          fecha: primera.fecha,
          metodo_pago: primera.metodo_pago,
          banco: primera.banco,
          estado: primera.estado,
          efectivo: parseFloat(primera.efectivo || 0),
          tarjeta: parseFloat(primera.tarjeta || 0),
          transferencia: parseFloat(primera.transferencia || 0),
          vuelto: parseFloat(primera.vuelto || 0),
          cliente: primera.clientes || { nombre: 'Cliente General' },
          items: data.map(v => ({
            nombre: v.productos?.nombre || 'Producto',
            marca: v.productos?.marca,
            unidad_medida: v.productos?.unidad_medida,
            cantidad: parseFloat(v.cantidad),
            precio_unitario: parseFloat(v.precio_unitario),
            total: parseFloat(v.total)
          })),
          total,
          credito: creditoInfo,
          saldoAnteriorIncluido,
          totalProductosNuevos
        });
      }
    } catch (err) {
      console.error('Error cargando factura:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarPDF = async () => {
    if (!factura) return;
    try {
      setGenerandoPDF(true);
      await PDFFactura(factura);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error al generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-factura-ver" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">
            <i className="fas fa-file-invoice"></i> Factura {numeroFactura}
          </h2>
          <button className="modal-cerrar" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-facturas">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Cargando factura...</p>
            </div>
          ) : !factura ? (
            <div className="sin-facturas">
              <i className="fas fa-inbox"></i>
              <p>No se encontró la factura</p>
            </div>
          ) : (
            <>
              <div className="accion-pdf-destacada">
                <button 
                  className="btn-descargar-pdf-grande" 
                  onClick={handleGenerarPDF}
                  disabled={generandoPDF}
                >
                  {generandoPDF ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Generando PDF...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-pdf"></i> Ver / Descargar Factura PDF
                    </>
                  )}
                </button>
              </div>

              <div className="factura-preview">
                <div className="factura-header-preview">
                  <h3>CARNICERÍA URBINA</h3>
                  <p>Factura: {factura.numero_factura}</p>
                  <p>Fecha: {new Date(factura.fecha).toLocaleString('es-MX')}</p>
                </div>

                <div className="factura-cliente-preview">
                  <strong>Cliente:</strong> {factura.cliente.nombre}
                  {factura.cliente.direccion && (
                    <>
                      <br />
                      <strong>Dirección:</strong> {factura.cliente.direccion}
                    </>
                  )}
                </div>

                <table className="tabla-factura-preview">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factura.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.nombre} {item.marca ? `(${item.marca})` : ''}</td>
                        <td>{item.cantidad} {item.unidad_medida}</td>
                        <td>C${item.precio_unitario.toFixed(2)}</td>
                        <td>C${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="factura-total-preview">
                  <span>TOTAL:</span>
                  <span>C${factura.total.toFixed(2)}</span>
                </div>

                <div className="factura-metodo-preview">
                  <strong>Método de pago:</strong> {factura.metodo_pago}
                  {factura.banco && ` (${factura.banco})`}
                </div>

                {factura.metodo_pago !== 'credito' && (factura.efectivo > 0 || factura.tarjeta > 0 || factura.transferencia > 0) && (
                  <div className="factura-desglose-preview">
                    {factura.efectivo > 0 && <span>Efectivo: C${factura.efectivo.toFixed(2)}</span>}
                    {factura.tarjeta > 0 && <span>Tarjeta: C${factura.tarjeta.toFixed(2)}</span>}
                    {factura.transferencia > 0 && <span>Transferencia: C${factura.transferencia.toFixed(2)}</span>}
                    {factura.vuelto > 0 && <span className="vuelto">Vuelto: C${factura.vuelto.toFixed(2)}</span>}
                  </div>
                )}

                {factura.metodo_pago === 'credito' && (
                  <div className="factura-credito-info">
                    <div className="credito-titulo">
                      <i className="fas fa-credit-card"></i>
                      <strong>INFORMACIÓN DEL CRÉDITO</strong>
                    </div>

                    {factura.saldoAnteriorIncluido > 0 && (
                      <>
                        <div className="credito-item">
                          <span>Productos nuevos:</span>
                          <strong>C${factura.totalProductosNuevos.toFixed(2)}</strong>
                        </div>
                        <div className="credito-item credito-saldo-anterior">
                          <span>Saldo anterior unificado:</span>
                          <strong>C${factura.saldoAnteriorIncluido.toFixed(2)}</strong>
                        </div>
                        <div className="credito-divisor"></div>
                      </>
                    )}

                    <div className="credito-detalle">
                      <div className="credito-item">
                        <span>Monto Total:</span>
                        <strong>C${(factura.credito?.monto_total || factura.total).toFixed(2)}</strong>
                      </div>
                      <div className="credito-item">
                        <span>Abonado:</span>
                        <strong style={{ color: '#2e7d32' }}>
                          C${(factura.credito?.monto_pagado || 0).toFixed(2)}
                        </strong>
                      </div>
                      <div className="credito-item credito-saldo">
                        <span>Saldo Pendiente:</span>
                        <strong style={{ color: '#e65100' }}>
                          C${(factura.credito?.saldo_pendiente || factura.total).toFixed(2)}
                        </strong>
                      </div>
                      {factura.credito?.fecha_fin && (
                        <div className="credito-item">
                          <span>Fecha Vencimiento:</span>
                          <strong>
                            {new Date(factura.credito.fecha_fin).toLocaleDateString('es-MX')}
                          </strong>
                        </div>
                      )}
                    </div>

                    {factura.credito?.saldo_pendiente > 0 && (
                      <div className="aviso-saldo-pendiente">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>
                          Esta factura tiene un saldo pendiente de{' '}
                          <strong>C${factura.credito.saldo_pendiente.toFixed(2)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {factura && (
          <div className="modal-footer">
            <button className="btn-modal-cancelar" onClick={onClose}>
              Cerrar
            </button>
            <button 
              className="btn-modal-guardar" 
              onClick={handleGenerarPDF}
              disabled={generandoPDF}
            >
              {generandoPDF ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Generando...
                </>
              ) : (
                <>
                  <i className="fas fa-file-pdf"></i> Descargar PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalVerFactura;