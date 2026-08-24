import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/logo2.png';

const PDFInventario = async (inventario, fecha, totalProductos, totalCantidad) => {
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

  // ===== CALCULAR TOTAL POR UNIDAD DE MEDIDA =====
  const totalPorUnidad = {};
  inventario.forEach(item => {
    const unidad = item.unidad_medida || 'unidad';
    if (!totalPorUnidad[unidad]) {
      totalPorUnidad[unidad] = 0;
    }
    totalPorUnidad[unidad] += item.cantidad;
  });

  // ===== GENERAR FILAS DE TOTAL POR UNIDAD =====
  const filasTotales = Object.keys(totalPorUnidad).map(unidad => `
    <tr style="background: #fff8f0; font-weight: bold;">
      <td colspan="5" style="padding: 10px 15px; text-align: right; color: #8B1E1E; font-size: 13px;">
        TOTAL EN ${unidad.toUpperCase()}:
      </td>
      <td style="padding: 10px 15px; text-align: right; color: #8B1E1E; font-size: 15px; font-weight: 700;">
        ${totalPorUnidad[unidad].toFixed(2)}
      </td>
    </tr>
  `).join('');

  // ===== GENERAR TABLA DE PRODUCTOS =====
  const filasProductos = inventario.map((item, index) => `
    <tr style="border-bottom: 1px solid #eee; ${index % 2 === 0 ? 'background: #faf7f6;' : ''}">
      <td style="padding: 10px 15px; font-size: 14px; color: #666; text-align: center;">${index + 1}</td>
      <td style="padding: 10px 15px; font-size: 14px; font-weight: 500; color: #2c3e50;">${item.nombre}</td>
      <td style="padding: 10px 15px; font-size: 13px; color: #555;">
        <span style="background: #e3f2fd; color: #1976d2; padding: 2px 10px; border-radius: 12px; font-size: 12px;">${item.categoria}</span>
      </td>
      <td style="padding: 10px 15px; font-size: 13px; color: #555;">${item.marca || '-'}</td>
      <td style="padding: 10px 15px; font-size: 13px; color: #555;">
        <span style="background: #f3e5f5; color: #7b1fa2; padding: 2px 10px; border-radius: 12px; font-size: 12px;">${item.unidad_medida}</span>
      </td>
      <td style="padding: 10px 15px; font-size: 15px; font-weight: 700; color: #8B1E1E; text-align: right;">${item.cantidad.toFixed(2)}</td>
    </tr>
  `).join('');

  // ===== GENERAR EL HTML DEL PDF =====
  container.innerHTML = `
    <div style="background: #b22222; padding: 20px 30px; display: flex; align-items: center; gap: 15px; border-radius: 10px 10px 0 0;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${logo}" alt="CARNICERÍA URBINA" style="height: 45px; width: auto; filter: brightness(0) invert(1);" />
      </div>
      <div style="color: white; flex: 1;">
        <div style="font-size: 20px; font-weight: 700; letter-spacing: 1px;">CARNICERÍA URBINA</div>
        <div style="font-size: 12px; opacity: 0.8;">Sistema de gestión de inventario</div>
      </div>
      <div style="color: white; text-align: right; font-size: 12px; opacity: 0.7;">
        <div>${fecha}</div>
      </div>
    </div>

    <div style="padding: 20px 30px; background: #f5f0ef;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="color: #8B1E1E; margin: 0; font-size: 22px;">📋 Reporte de Inventario</h2>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Fecha: ${fecha}</p>
        </div>
        <div style="text-align: right;">
          <div style="background: #FBAC3E; color: white; padding: 5px 15px; border-radius: 5px; font-weight: bold; font-size: 14px;">
            ${totalProductos} productos
          </div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: #8B1E1E; color: white;">
            <th style="padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">#</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Producto</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Categoría</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Marca</th>
            <th style="padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Unidad</th>
            <th style="padding: 12px 15px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          ${filasProductos}
          <!-- Totales por unidad de medida -->
          ${filasTotales}
        </tbody>
      </table>

      <div style="margin-top: 20px; padding: 15px 20px; background: white; border-radius: 8px; border-left: 4px solid #FBAC3E; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #666;">
          <span>📅 Fecha de generación: ${new Date().toLocaleString()}</span>
          <span style="color: #8B1E1E; font-weight: 600;">CARNICERÍA URBINA</span>
        </div>
      </div>

      <div style="margin-top: 15px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 15px;">
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
  pdf.save(`Inventario_${fecha}.pdf`);
};

export default PDFInventario;