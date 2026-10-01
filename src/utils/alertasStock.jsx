export const STOCK_MINIMO_DEFECTO = 5;
 
export const estaBajoStock = (cantidad, minimo = STOCK_MINIMO_DEFECTO) => {
  const min = minimo === null || minimo === undefined ? STOCK_MINIMO_DEFECTO : Number(minimo);
  return Number(cantidad) <= min;
};
 
export const mensajeStockBajo = (nombre, cantidad, unidad) =>
  `⚠️ Queda poco stock de "${nombre}": ${Number(cantidad).toFixed(2)} ${unidad || ''}`.trim();
 
// Convierte el valor de un input en un mínimo válido
export const leerStockMinimo = (valor) => {
  const n = parseFloat(valor);
  return Number.isNaN(n) || n < 0 ? STOCK_MINIMO_DEFECTO : n;
};