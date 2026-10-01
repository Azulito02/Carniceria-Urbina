import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../../assets/logo2.png';

const DATOS_NEGOCIO = {
  nombre: 'CARNICERÍA URBINA',
  eslogan: 'Sistema de gestión de inventario y ventas',
  direccion: 'Dirección de la carnicería',
  telefono: 'Teléfono'
};

const PDFFactura = async (factura) => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '20px';
  container.style.background = 'white';
  container.style.fontFamily = 'Arial, sans-serif';
  document.body.appendChild(container);

  const filasProductos = factura.items.map((item, index) => `
    <tr style="border-bottom: 1px solid #f0e8e6; ${index % 2 === 0 ? 'background: #faf7f6;' : ''}">
      <td style="padding: 10px 15px; font-size: 13px; color: #B1B3B6; text-align: center;">${index + 1}</td>
      <td style="padding: 10px 15px; font-size: 14px; font-weight: 500; color: #2c3e50;">
        ${item.nombre} ${item.marca ? `<span style="color: #B1B3B6; font-size: 12px;">(${item.marca})</span>` : ''}
      </td>
      <td style="padding: 10px 15px; font-size: 13px; color: #555;">
        <span style="background: #fff8f0; color: #FBAC3E; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;">${item.unidad_medida}</span>
      </td>
      <td style="padding: 10px 15px; font-size: 14px; font-weight: 600; color: #333; text-align: right;">${item.cantidad.toFixed(2)}</td>
      <td style="padding: 10px 15px; font-size: 13px; color: #555; text-align: right;">C$${item.precio_unitario.toFixed(2)}</td>
      <td style="padding: 10px 15px; font-size: 15px; font-weight: 700; color: #8B1E1E; text-align: right;">C$${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  const fechaFormateada = new Date(factura.fecha).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let desgloseHTML = '';
  if (factura.metodo_pago !== 'credito') {
    const pagos = [];
    if (factura.efectivo > 0) pagos.push(`Efectivo: C$${factura.efectivo.toFixed(2)}`);
    if (factura.tarjeta > 0) pagos.push(`Tarjeta: C$${factura.tarjeta.toFixed(2)}`);
    if (factura.transferencia > 0) pagos.push(`Transferencia: C$${factura.transferencia.toFixed(2)}`);
    if (factura.vuelto > 0) pagos.push(`Vuelto: C$${factura.vuelto.toFixed(2)}`);
    
    if (pagos.length > 0) {
      desgloseHTML = `
        <div style="margin-top: 12px; padding: 12px 16px; background: #f5f0ef; border-radius: 8px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; font-size: 12px;">
          ${pagos.map(p => `<span style="background: white; padding: 4px 12px; border-radius: 20px; font-weight: 500;">${p}</span>`).join('')}
        </div>
      `;
    }
  }

  let creditoHTML = '';
  if (factura.metodo_pago === 'credito' && factura.credito) {
    const credito = factura.credito;
    const montoTotal = parseFloat(credito.monto_total || factura.total);
    const montoPagado = parseFloat(credito.monto_pagado || 0);
    const saldoPendiente = parseFloat(credito.saldo_pendiente || montoTotal);
    const fechaFin = credito.fecha_fin ? new Date(credito.fecha_fin).toLocaleDateString('es-MX') : '';
    const saldoAnterior = factura.saldoAnteriorIncluido || 0;
    const totalProductos = factura.totalProductosNuevos || montoTotal;

    creditoHTML = `
      <div style="margin-top: 16px; padding: 16px; background: #fff8f0; border-left: 4px solid #FBAC3E; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; color: #8B1E1E; font-size: 13px; font-weight: 700; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f0e8e6; text-transform: uppercase;">
          <span style="color: #FBAC3E; font-size: 16px;">💳</span>
          INFORMACIÓN DEL CRÉDITO
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${saldoAnterior > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: #666;">Productos nuevos:</span>
              <strong style="color: #333;">C$${totalProductos.toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 8px 12px; background: #fff3e0; border-radius: 6px;">
              <span style="color: #e65100; font-weight: 600;">Saldo anterior unificado:</span>
              <strong style="color: #e65100;">C$${saldoAnterior.toFixed(2)}</strong>
            </div>
            <div style="height: 1px; background: #f0e8e6; margin: 4px 0;"></div>
          ` : ''}
          
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: #666;">Monto Total:</span>
            <strong style="color: #333;">C$${montoTotal.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: #666;">Abonado:</span>
            <strong style="color: #2e7d32;">C$${montoPagado.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 10px 12px; background: white; border-radius: 8px; margin-top: 4px;">
            <span style="color: #666; font-weight: 600;">Saldo Pendiente:</span>
            <strong style="color: #e65100; font-size: 16px;">C$${saldoPendiente.toFixed(2)}</strong>
          </div>
          ${fechaFin ? `
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: #666;">Fecha Vencimiento:</span>
            <strong style="color: #333;">${fechaFin}</strong>
          </div>
          ` : ''}
        </div>

        ${saldoPendiente > 0 ? `
        <div style="margin-top: 14px; padding: 12px 16px; background: #fff3e0; border: 1px solid #FBAC3E; border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 12px; color: #e65100;">
          <span style="font-size: 16px;">⚠️</span>
          <span>Esta factura tiene un saldo pendiente de <strong style="color: #8B1E1E;">C$${saldoPendiente.toFixed(2)}</strong></span>
        </div>
        ` : `
        <div style="margin-top: 14px; padding: 12px 16px; background: #e8f5e9; border: 1px solid #2e7d32; border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 12px; color: #2e7d32;">
          <span style="font-size: 16px;">✅</span>
          <span>Esta factura está <strong>totalmente pagada</strong></span>
        </div>
        `}
      </div>
    `;
  }

  container.innerHTML = `
    <div style="background: #8B1E1E; padding: 20px 30px; display: flex; align-items: center; gap: 15px; border-radius: 10px 10px 0 0;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${logo}" alt="CARNICERÍA URBINA" style="height: 50px; width: auto; filter: brightness(0) invert(1);" />
      </div>
      <div style="color: white; flex: 1;">
        <div style="font-size: 22px; font-weight: 700; letter-spacing: 1px;">${DATOS_NEGOCIO.nombre}</div>
        <div style="font-size: 12px; opacity: 0.85;">${DATOS_NEGOCIO.eslogan}</div>
      </div>
      <div style="color: white; text-align: right; font-size: 12px;">
        <div style="font-size: 18px; font-weight: 700;">FACTURA</div>
        <div style="opacity: 0.9;">${factura.numero_factura}</div>
      </div>
    </div>

    <div style="padding: 20px 30px; background: #f5f0ef;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="background: white; padding: 15px 20px; border-radius: 8px; border-left: 4px solid #FBAC3E;">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #B1B3B6; margin-bottom: 6px;">Cliente</div>
          <div style="font-size: 15px; font-weight: 600; color: #333;">${factura.cliente.nombre}</div>
          ${factura.cliente.direccion ? `<div style="font-size: 12px; color: #B1B3B6; margin-top: 4px;">${factura.cliente.direccion}</div>` : ''}
        </div>
        <div style="background: white; padding: 15px 20px; border-radius: 8px; border-left: 4px solid #FBAC3E;">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #B1B3B6; margin-bottom: 6px;">Fecha</div>
          <div style="font-size: 14px; font-weight: 500; color: #333;">${fechaFormateada}</div>
          <div style="font-size: 11px; color: #B1B3B6; margin-top: 6px;">Método: <strong style="color: #8B1E1E; text-transform: uppercase;">${factura.metodo_pago}</strong>${factura.banco ? ` - ${factura.banco}` : ''}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <thead>
          <tr style="background: #8B1E1E; color: white;">
            <th style="padding: 12px 15px; text-align: center; font-size: 11px; text-transform: uppercase;">#</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 11px; text-transform: uppercase;">Producto</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 11px; text-transform: uppercase;">Unidad</th>
            <th style="padding: 12px 15px; text-align: right; font-size: 11px; text-transform: uppercase;">Cant.</th>
            <th style="padding: 12px 15px; text-align: right; font-size: 11px; text-transform: uppercase;">Precio</th>
            <th style="padding: 12px 15px; text-align: right; font-size: 11px; text-transform: uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${filasProductos}
          <tr style="background: #f5f0ef; font-weight: bold; border-top: 2px solid #8B1E1E;">
            <td colspan="5" style="padding: 15px; text-align: right; color: #8B1E1E; font-size: 15px;">TOTAL:</td>
            <td style="padding: 15px; text-align: right; color: #8B1E1E; font-size: 18px; font-weight: 700;">C$${factura.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      ${desgloseHTML}
      ${creditoHTML}

      <div style="margin-top: 20px; padding: 15px 20px; background: white; border-radius: 8px; border-left: 4px solid #FBAC3E;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #B1B3B6;">
          <span>📅 Generado: ${new Date().toLocaleString('es-MX')}</span>
          <span style="color: #8B1E1E; font-weight: 600;">${DATOS_NEGOCIO.nombre}</span>
        </div>
      </div>

      <div style="margin-top: 15px; text-align: center; font-size: 11px; color: #B1B3B6; border-top: 1px solid #f0e8e6; padding-top: 15px;">
        ¡Gracias por su compra!<br/>
        Reporte generado automáticamente por el sistema de gestión ${DATOS_NEGOCIO.nombre}
      </div>
    </div>
  `;

  await new Promise(resolve => setTimeout(resolve, 500));

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  document.body.removeChild(container);
  pdf.save(`Factura_${factura.numero_factura}.pdf`);
};

export default PDFFactura;