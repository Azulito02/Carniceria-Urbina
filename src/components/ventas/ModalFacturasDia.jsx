import React, { useState, useEffect } from 'react';
import { supabase } from '../../database/supabase';
import './ModalFacturasDia.css';

const ModalFacturasDia = ({ isOpen, onClose, onVerFactura }) => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      cargarFacturas();
    }
  }, [isOpen, fecha]);

  const cargarFacturas = async () => {
    try {
      setLoading(true);

      const inicioDia = new Date(fecha + 'T00:00:00');
      const finDia = new Date(fecha + 'T23:59:59');

      const { data, error } = await supabase
        .from('ventas')
        .select(`
          numero_factura,
          fecha,
          total,
          metodo_pago,
          cliente_id,
          clientes (nombre)
        `)
        .gte('fecha', inicioDia.toISOString())
        .lte('fecha', finDia.toISOString())
        .order('fecha', { ascending: false });

      if (error) throw error;

      // Agrupar por numero_factura
      const agrupadas = {};
      (data || []).forEach(v => {
        if (!agrupadas[v.numero_factura]) {
          agrupadas[v.numero_factura] = {
            numero_factura: v.numero_factura,
            fecha: v.fecha,
            total: 0,
            metodo_pago: v.metodo_pago,
            cliente_nombre: v.clientes?.nombre || 'Cliente General',
            cantidad_productos: 0
          };
        }
        agrupadas[v.numero_factura].total += parseFloat(v.total || 0);
        agrupadas[v.numero_factura].cantidad_productos += 1;
      });

      setFacturas(Object.values(agrupadas));
    } catch (err) {
      console.error('Error cargando facturas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-facturas" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">
            <i className="fas fa-receipt"></i> Facturas del Día
          </h2>
          <button className="modal-cerrar" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="filtro-fecha-facturas">
            <label>Fecha:</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="fecha-input"
            />
          </div>

          {loading ? (
            <div className="loading-facturas">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Cargando facturas...</p>
            </div>
          ) : facturas.length === 0 ? (
            <div className="sin-facturas">
              <i className="fas fa-inbox"></i>
              <p>No hay facturas en esta fecha</p>
            </div>
          ) : (
            <div className="lista-facturas">
              {facturas.map(f => (
                <div key={f.numero_factura} className="factura-item">
                  <div className="factura-info">
                    <span className="factura-numero">
                      <i className="fas fa-file-invoice"></i> {f.numero_factura}
                    </span>
                    <span className="factura-cliente">{f.cliente_nombre}</span>
                    <span className="factura-hora">
                      {new Date(f.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="factura-detalles">
                    <span className="factura-productos">{f.cantidad_productos} productos</span>
                    <span className={`factura-metodo ${f.metodo_pago}`}>
                      {f.metodo_pago}
                    </span>
                    <span className="factura-total">C${f.total.toFixed(2)}</span>
                    <button
                      className="btn-ver-factura"
                      onClick={() => onVerFactura(f.numero_factura)}
                    >
                      <i className="fas fa-eye"></i> Ver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalFacturasDia;