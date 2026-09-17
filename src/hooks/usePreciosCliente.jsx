import { useState, useEffect } from 'react';
import { supabase } from '../database/supabase';

const usePreciosCliente = (clienteId) => {
  const [preciosCliente, setPreciosCliente] = useState({});
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarPrecios = async () => {
      if (!clienteId || clienteId === 'general' || clienteId === '') {
        setPreciosCliente({});
        return;
      }

      try {
        setCargando(true);

        // Traer todas las ventas del cliente ordenadas por fecha descendente
        const { data, error } = await supabase
          .from('ventas')
          .select('producto_id, precio_unitario, fecha')
          .eq('cliente_id', clienteId)
          .order('fecha', { ascending: false });

        if (error) throw error;

        // Crear mapa { producto_id: precio_unitario }
        // Solo se guarda el precio más reciente (por eso el orden desc)
        const mapa = {};
        (data || []).forEach(v => {
          if (!mapa[v.producto_id]) {
            mapa[v.producto_id] = parseFloat(v.precio_unitario);
          }
        });

        console.log('💰 Precios del cliente cargados:', mapa);
        setPreciosCliente(mapa);
      } catch (err) {
        console.error('Error cargando precios del cliente:', err);
        setPreciosCliente({});
      } finally {
        setCargando(false);
      }
    };

    cargarPrecios();
  }, [clienteId]);

  return { preciosCliente, cargando };
};

export default usePreciosCliente;