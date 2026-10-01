// src/services/StockService.js
import { supabase } from '../database/supabase';
import { estaBajoStock, mensajeStockBajo } from '../utils/alertasStock';

export const EVENTO_STOCK = 'stock-actualizado';

/** Avisa a la campanita del encabezado que debe recalcular el stock. */
export const notificarCambioStock = () => {
  window.dispatchEvent(new Event(EVENTO_STOCK));
};

/**
 * Devuelve un objeto { [producto_id]: { nombre, unidad_medida, stock_minimo,
 * cantidad_inventario, fecha_inventario, stock_disponible } }
 * Solo incluye productos que ya tienen un registro de inventario.
 */
export const obtenerMapaStock = async () => {
  try {
    const { data, error } = await supabase.from('stock_actual').select('*');
    if (error) {
      console.error('Error leyendo stock_actual:', error);
      return {};
    }
    const mapa = {};
    (data || []).forEach((r) => {
      mapa[r.producto_id] = {
        ...r,
        stock_minimo: r.stock_minimo ?? 5,
        stock_disponible: Number(r.stock_disponible),
      };
    });
    return mapa;
  } catch (err) {
    console.error('Error de red leyendo stock:', err);
    return {};
  }
};

/**
 * Llamar DESPUÉS de guardar una venta, con los ids de los productos vendidos.
 * Devuelve un arreglo de mensajes (vacío si ninguno quedó con poco stock).
 */
export const avisosStockTrasVenta = async (productoIds = []) => {
  const mapa = await obtenerMapaStock();
  const vistos = new Set();
  const avisos = [];

  productoIds.forEach((id) => {
    if (vistos.has(id)) return;
    vistos.add(id);

    const s = mapa[id];
    if (!s) return;

    if (s.stock_disponible <= 0) {
      avisos.push(`🚫 "${s.nombre}" se agotó (disponible: 0 ${s.unidad_medida || ''})`.trim());
    } else if (estaBajoStock(s.stock_disponible, s.stock_minimo)) {
      avisos.push(mensajeStockBajo(s.nombre, s.stock_disponible, s.unidad_medida));
    }
  });

  return avisos;
};