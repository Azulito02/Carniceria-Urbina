// src/hooks/useRealtimeSync.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../database/supabase';
import { guardarLocal, obtenerLocal, guardarTimestamp, tieneInternet } from '../utils/storage';
import { sincronizarOperaciones } from '../services/OfflineService';

export const useRealtimeSync = (tabla, key, orden = 'nombre') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conectado, setConectado] = useState(tieneInternet());
  const [sincronizando, setSincronizando] = useState(false);
  const subscriptionRef = useRef(null);
  const isMounted = useRef(true);
  const procesandoRef = useRef(false);

  // ===== CARGAR DATOS LOCALES =====
  const cargarDatosLocales = useCallback(() => {
    try {
      const datos = obtenerLocal(key);
      if (datos && Array.isArray(datos)) {
        // Eliminar IDs temporales y duplicados por nombre
        const vistos = new Map();
        const unicos = datos.filter(item => {
          // Filtrar IDs temporales
          if (typeof item.id === 'string' && item.id.startsWith('local_')) return false;
          if (typeof item.id === 'string' && item.id.startsWith('temp_')) return false;
          if (typeof item.id === 'string' && item.id.startsWith('op_')) return false;
          
          // Eliminar duplicados por nombre
          const keyName = item.nombre?.toLowerCase() || item.id;
          if (vistos.has(keyName)) return false;
          vistos.set(keyName, true);
          return true;
        });
        setData(unicos);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error cargando datos locales:', err);
      return false;
    }
  }, [key]);

  // ===== GUARDAR DATOS LOCALMENTE =====
  const guardarDatosLocales = useCallback((nuevosDatos) => {
    try {
      if (nuevosDatos && Array.isArray(nuevosDatos)) {
        const limpios = nuevosDatos.filter(item => {
          if (typeof item.id === 'string' && item.id.startsWith('local_')) return false;
          if (typeof item.id === 'string' && item.id.startsWith('temp_')) return false;
          if (typeof item.id === 'string' && item.id.startsWith('op_')) return false;
          return true;
        });
        guardarLocal(key, limpios);
        guardarTimestamp(key);
      }
    } catch (err) {
      console.error('Error guardando datos locales:', err);
    }
  }, [key]);

  // ===== RECARGAR DESDE SUPABASE =====
  const recargarDesdeSupabase = useCallback(async () => {
    if (!tieneInternet()) {
      cargarDatosLocales();
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: supabaseData, error: supabaseError } = await supabase
        .from(tabla)
        .select('*')
        .order(orden);

      if (supabaseError) {
        console.error('Error cargando:', supabaseError);
        cargarDatosLocales();
        setLoading(false);
        return null;
      }

      if (supabaseData && Array.isArray(supabaseData)) {
        // Limpiar y eliminar duplicados por nombre
        const vistos = new Map();
        const unicos = supabaseData.filter(item => {
          if (typeof item.id === 'string' && (item.id.startsWith('local_') || item.id.startsWith('temp_') || item.id.startsWith('op_'))) {
            return false;
          }
          const keyName = item.nombre?.toLowerCase() || item.id;
          if (vistos.has(keyName)) return false;
          vistos.set(keyName, true);
          return true;
        });
        
        setData(unicos);
        guardarDatosLocales(unicos);
        return unicos;
      }

      return [];
    } catch (err) {
      console.error('Error inesperado:', err);
      cargarDatosLocales();
      return null;
    } finally {
      setLoading(false);
    }
  }, [tabla, orden, key, guardarDatosLocales, cargarDatosLocales]);

  // ===== SUSCRIBIRSE A CAMBIOS EN TIEMPO REAL =====
  const suscribirse = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    if (!tieneInternet()) {
      console.log(`📡 ${tabla} offline`);
      return;
    }

    console.log(`📡 Suscribiendo a ${tabla}...`);

    subscriptionRef.current = supabase
      .channel(`${tabla}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tabla
        },
        async (payload) => {
          if (procesandoRef.current) {
            console.log('⏳ Procesando...');
            return;
          }
          
          procesandoRef.current = true;
          
          try {
            console.log(`🔄 Evento: ${payload.eventType}`);

            if (payload.eventType === 'INSERT') {
              const nuevoId = payload.new?.id;
              const nombre = payload.new?.nombre?.toLowerCase();
              
              // Ignorar IDs temporales
              if (typeof nuevoId === 'string' && (nuevoId.startsWith('local_') || nuevoId.startsWith('temp_') || nuevoId.startsWith('op_'))) {
                console.log('⏭️ Ignorando ID temporal');
                return;
              }

              setData((prevData) => {
                // 1. Verificar por ID
                if (prevData.some(item => item.id === nuevoId)) {
                  console.log(`⏭️ ID ${nuevoId} ya existe`);
                  return prevData;
                }

                // 2. Verificar por nombre (evitar duplicados)
                if (nombre && prevData.some(item => item.nombre?.toLowerCase() === nombre)) {
                  console.log(`⏭️ "${payload.new?.nombre}" ya existe`);
                  return prevData;
                }

                // 3. Agregar
                console.log(`✅ Agregando "${payload.new?.nombre}"`);
                const nuevosDatos = [...prevData, payload.new];
                nuevosDatos.sort((a, b) => {
                  if (a[orden] < b[orden]) return -1;
                  if (a[orden] > b[orden]) return 1;
                  return 0;
                });
                guardarDatosLocales(nuevosDatos);
                return nuevosDatos;
              });
            } else if (payload.eventType === 'DELETE') {
              setData((prevData) => {
                const nuevos = prevData.filter(item => item.id !== payload.old.id);
                guardarDatosLocales(nuevos);
                return nuevos;
              });
            } else if (payload.eventType === 'UPDATE') {
              setData((prevData) => {
                const nuevos = prevData.map(item => 
                  item.id === payload.new.id ? payload.new : item
                );
                guardarDatosLocales(nuevos);
                return nuevos;
              });
            }
          } finally {
            procesandoRef.current = false;
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Estado: ${status}`);
        setConectado(status === 'SUBSCRIBED');
      });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [tabla, orden, guardarDatosLocales]);

  // ===== SINCRONIZAR =====
  const sincronizar = useCallback(async () => {
    if (sincronizando) return;
    
    if (!tieneInternet()) {
      setError('Sin internet');
      return;
    }
    
    try {
      setSincronizando(true);
      setError(null);
      
      // Sincronizar operaciones pendientes (incluye inventario)
      await sincronizarOperaciones();
      
      // Recargar datos desde Supabase
      await recargarDesdeSupabase();
      
      console.log(`✅ ${tabla} sincronizado`);
    } catch (err) {
      console.error('Error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setSincronizando(false);
    }
  }, [recargarDesdeSupabase, sincronizando, tabla]);

  // ===== EFECTO PRINCIPAL =====
  useEffect(() => {
    isMounted.current = true;

    cargarDatosLocales();

    if (tieneInternet()) {
      recargarDesdeSupabase().then(() => {
        if (isMounted.current) {
          suscribirse();
          sincronizarOperaciones();
        }
      });
    } else {
      console.log(`📡 ${tabla} offline`);
      setLoading(false);
    }

    const handleOnline = () => {
      console.log('🟢 Conexión restaurada');
      setConectado(true);
      setError(null);
      sincronizar();
    };

    const handleOffline = () => {
      console.log('🔴 Conexión perdida');
      setConectado(false);
      setError('Sin conexión');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  return {
    data,
    setData,
    loading,
    error,
    conectado,
    sincronizando,
    sincronizar,
    recargar: recargarDesdeSupabase,
    actualizar: setData
  };
};

export default useRealtimeSync;