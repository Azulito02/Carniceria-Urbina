import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/logo2.png';

const PDFInversiones = async (inversiones, fecha, totalInversiones, totalTransferencia, totalEfectivo) => {
  // Crear un contenedor temporal para renderizar el PDF
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '20px';
  container.style.background = 'white';
  container.style.fontFamily = 'Arial, sans-serif';
  document.body.appendChild(container);

  // ===== GENERAR TABLA DE INVERSIONES =====
  const filasInversiones = inversiones.map((item, index) => {
    // Determinar color según tipo
    let tipoColor = '';
    let tipoBg = '';
    if (item.tipo_monto === 'transferencia') {
      tipoColor = '#e65100';
      tipoBg = '#fff3e0';
    } else if (item.tipo_monto === 'efectivo') {
      tipoColor = '#2e7d32';
      tipoBg = '#e8f5e9';
    } else {
      tipoColor = '#7c3aed';
      tipoBg = '#ede9fe';
    }

    // Determinar color según banco
    let bancoColor = '';
    let bancoBg = '';
    if (item.banco === 'ficohsa') {
      bancoColor = '#d97706';
      bancoBg = '#fef3c7';
    } else if (item.banco === 'lafise') {
      bancoColor = '#4338ca';
      bancoBg = '#e0e7ff';
    } else if (item.banco === 'banpro') {
      bancoColor = '#dc2626';
      bancoBg = '#fce4ec';
    } else if (item.banco === 'avanz') {
      bancoColor = '#059669';
      bancoBg = '#d1fae5';
    } else if (item.banco === 'bac') {
      bancoColor = '#7c3aed';
      bancoBg = '#f3e8ff';
    } else if (item.banco === 'bdf') {
      bancoColor = '#dc2626';
      bancoBg = '#fef2f2';
    } else {
      bancoColor = '#B1B3B6';
      bancoBg = '#f1f5f9';
    }

    // Formatear fecha para el PDF
    const formatFecha = (fechaISO) => {
      if (!fechaISO) return 'Fecha no disponible';
      try {
        const fechaUTC = new Date(fechaISO);
        const fechaNic = new Date(fechaUTC.getTime() - (6 * 60 * 60 * 1000));
        
        const d = fechaNic.getDate().toString().padStart(2, '0');
        const m = (fechaNic.getMonth() + 1).toString().padStart(2, '0');
        const y = fechaNic.getFullYear();
        
        let h = fechaNic.getHours();
        const min = fechaNic.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'p.m.' : 'a.m.';
        
        h = h % 12;
        h = h ? h.toString().padStart(2, '0') : '12';
        
        return `${d}/${m}/${y} ${h}:${min} ${ampm}`;
      } catch (e) {
        return fechaISO;
      }
    };

    return `
      <tr style="border-bottom: 1px solid #f0e8e6; ${index % 2 === 0 ? 'background: #faf7f6;' : 'background: white;'}">
        <td style="padding: 10px 15px; font-size: 12px; color: #B1B3B6; text-align: center;">${index + 1}</td>
        <td style="padding: 10px 15px; font-size: 12px; color: #B1B3B6;">${formatFecha(item.fecha)}</td>
        <td style="padding: 10px 15px; font-size: 14px; font-weight: 500; color: #2c3e50;">${item.nombre}</td>
        <td style="padding: 10px 15px; font-size: 12px;">
          <span style="background: ${tipoBg}; color: ${tipoColor}; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">${item.tipo_monto}</span>
        </td>
        <td style="padding: 10px 15px; font-size: 12px;">
          ${item.banco ? `<span style="background: ${bancoBg}; color: ${bancoColor}; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">${item.banco}</span>` : '<span style="color: #B1B3B6; font-size: 11px;">N/A</span>'}
        </td>
        <td style="padding: 10px 15px; font-size: 15px; font-weight: 700; color: #8B1E1E; text-align: right;">C$${parseFloat(item.monto || 0).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  // ===== GENERAR EL HTML DEL PDF =====
  container.innerHTML = `
    <div style="background: #8B1E1E; padding: 20px 30px; display: flex; align-items: center; gap: 15px; border-radius: 10px 10px 0 0;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${logo}" alt="CARNICERÍA URBINA" style="height: 45px; width: auto; filter: brightness(0) invert(1);" />
      </div>
      <div style="color: white; flex: 1;">
        <div style="font-size: 20px; font-weight: 700; letter-spacing: 1px;">CARNICERÍA URBINA</div>
        <div style="font-size: 12px; opacity: 0.8;">Sistema de gestión de inversiones</div>
      </div>
      <div style="color: white; text-align: right; font-size: 12px; opacity: 0.7;">
        <div>${fecha}</div>
      </div>
    </div>

    <div style="padding: 20px 30px; background: #f5f0ef;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="color: #8B1E1E; margin: 0; font-size: 22px;">💰 Reporte de Inversiones</h2>
          <p style="color: #B1B3B6; margin: 5px 0 0 0; font-size: 14px;">Período: ${fecha}</p>
        </div>
        <div style="text-align: right;">
          <div style="background: #FBAC3E; color: white; padding: 5px 15px; border-radius: 5px; font-weight: bold; font-size: 14px;">
            ${inversiones.length} registros
          </div>
        </div>
      </div>

      <!-- ===== TARJETAS DE RESUMEN ===== -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="background: white; border-radius: 8px; padding: 15px 20px; border-left: 4px solid #8B1E1E; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #B1B3B6;">TOTAL INVERTIDO</div>
          <div style="font-size: 22px; font-weight: 700; color: #8B1E1E;">C$${totalInversiones.toFixed(2)}</div>
        </div>
        <div style="background: white; border-radius: 8px; padding: 15px 20px; border-left: 4px solid #FBAC3E; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #B1B3B6;">TRANSFERENCIA</div>
          <div style="font-size: 22px; font-weight: 700; color: #FBAC3E;">C$${totalTransferencia.toFixed(2)}</div>
        </div>
        <div style="background: white; border-radius: 8px; padding: 15px 20px; border-left: 4px solid #2e7d32; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #B1B3B6;">EFECTIVO</div>
          <div style="font-size: 22px; font-weight: 700; color: #2e7d32;">C$${totalEfectivo.toFixed(2)}</div>
        </div>
      </div>

      <!-- ===== TABLA DE INVERSIONES ===== -->
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: #8B1E1E; color: white;">
            <th style="padding: 12px 15px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">#</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Fecha</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Nombre</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Tipo</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Banco</th>
            <th style="padding: 12px 15px; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${filasInversiones}
          <!-- ===== FILA DE TOTAL ===== -->
          <tr style="background: #f5f0ef; font-weight: bold; border-top: 2px solid #8B1E1E;">
            <td colspan="5" style="padding: 12px 15px; text-align: right; color: #8B1E1E; font-size: 14px;">
              TOTAL GENERAL:
            </td>
            <td style="padding: 12px 15px; text-align: right; color: #8B1E1E; font-size: 16px; font-weight: 700;">
              C$${totalInversiones.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 20px; padding: 15px 20px; background: white; border-radius: 8px; border-left: 4px solid #FBAC3E; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #B1B3B6;">
          <span>📅 Fecha de generación: ${new Date().toLocaleString('es-MX')}</span>
          <span style="color: #8B1E1E; font-weight: 600;">CARNICERÍA URBINA</span>
        </div>
      </div>

      <div style="margin-top: 15px; text-align: center; font-size: 11px; color: #B1B3B6; border-top: 1px solid #f0e8e6; padding-top: 15px;">
        Reporte generado automáticamente por el sistema de gestión Carnicería Urbina
      </div>
    </div>
  `;

  // Esperar a que se cargue la imagen del logo
  await new Promise(resolve => setTimeout(resolve, 500));

  // Convertir a canvas
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  // Crear PDF
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Eliminar el contenedor temporal
  document.body.removeChild(container);

  // Descargar PDF
  pdf.save(`Inversiones_${fecha}.pdf`);
};

export default PDFInversiones;