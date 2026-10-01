// src/hooks/useStockBajo.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../database/supabase';
import { estaBajoStock } from '../utils/alertasStock';
import { EVENTO_STOCK } from '../services/StockService';

/**
 * Productos cuyo stock disponible (inventario - ventas) está en o por debajo
 * de su stock_minimo. Se recalcula con cambios en tiempo real y cuando
 * Ventas dispara el evento 'stock-actualizado'.
 */
export default function useStockBajo() {
  const [productosBajos, setProductosBajos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const calcular = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('stock_actual').select('*');
      if (error) return; // sin conexión u otro error: se conserva lo último mostrado

      const bajos = (data || [])
        .filter((r) => estaBajoStock(r.stock_disponible, r.stock_minimo))
        .map((r) => ({
          id: r.producto_id,
          nombre: r.nombre,
          unidad_medida: r.unidad_medida,
          stock_minimo: r.stock_minimo ?? 5,
          cantidad: Math.max(0, Number(r.stock_disponible)),
        }))
        .sort((a, b) => a.cantidad - b.cantidad);

      setProductosBajos(bajos);
    } catch (err) {
      console.error('Error calculando stock bajo:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    calcular();

    const canal = supabase
      .channel(`stock_bajo_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, calcular)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, calcular)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, calcular)
      .subscribe();

    window.addEventListener(EVENTO_STOCK, calcular);

    return () => {
      window.removeEventListener(EVENTO_STOCK, calcular);
      supabase.removeChannel(canal);
    };
  }, [calcular]);

  return { productosBajos, cargando, recalcular: calcular };
}