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

        setFactura({
          numero_factura: numeroFactura,
          fecha: primera.fecha,
          metodo_pago: primera.metodo_pago,
          banco: primera.banco,
          estado: primera.estado,
          cliente: primera.clientes || { nombre: 'Cliente General' },
          items: data.map(v => ({
            nombre: v.productos?.nombre || 'Producto',
            marca: v.productos?.marca,
            unidad_medida: v.productos?.unidad_medida,
            cantidad: parseFloat(v.cantidad),
            precio_unitario: parseFloat(v.precio_unitario),
            total: parseFloat(v.total)
          })),
          total
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
            </div>
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
                  <i className="fas fa-file-pdf"></i> Ver PDF
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