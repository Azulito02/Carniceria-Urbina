// src/services/OfflineService.js

import { supabase } from '../database/supabase';
import { guardarLocal, obtenerLocal, tieneInternet } from '../utils/storage';

const COLA_KEY = 'operaciones_pendientes';
const PROCESADAS_KEY = 'operaciones_procesadas';

// ===== MARCAR COMO PROCESADA =====
export const marcarComoProcesada = (id) => {
  try {
    const procesadas = obtenerLocal(PROCESADAS_KEY) || [];
    if (!procesadas.includes(id)) {
      procesadas.push(id);
      guardarLocal(PROCESADAS_KEY, procesadas);
    }
    return true;
  } catch (error) {
    console.error('Error marcando como procesada:', error);
    return false;
  }
};

// ===== VERIFICAR SI YA FUE PROCESADA =====
export const yaFueProcesada = (id) => {
  try {
    const procesadas = obtenerLocal(PROCESADAS_KEY) || [];
    return procesadas.includes(id);
  } catch (error) {
    return false;
  }
};

// ===== LIMPIAR PROCESADAS =====
export const limpiarProcesadas = () => {
  try {
    guardarLocal(PROCESADAS_KEY, []);
  } catch (error) {
    console.error('Error limpiando procesadas:', error);
  }
};

// ===== AGREGAR OPERACIÓN =====
export const agregarOperacion = (operacion) => {
  try {
    const cola = obtenerLocal(COLA_KEY) || [];
    const idUnico = `op_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    // Verificar si ya hay una operación IDÉNTICA en la cola
    const yaExiste = cola.some(op => {
      // Para inventario, verificar por fecha
      if (op.esInventario && operacion.esInventario) {
        return op.fecha === operacion.fecha;
      }
      // Para otros, verificar por datos
      return op.tipo === operacion.tipo && 
             op.tabla === operacion.tabla &&
             JSON.stringify(op.datos) === JSON.stringify(operacion.datos);
    });
    
    if (yaExiste) {
      console.log('⏭️ Operación ya existe en la cola, omitiendo');
      return null;
    }
    
    cola.push({
      ...operacion,
      id: idUnico,
      fecha: new Date().toISOString(),
      intentos: 0
    });
    guardarLocal(COLA_KEY, cola);
    console.log('📝 Operación agregada a la cola:', operacion);
    return idUnico;
  } catch (error) {
    console.error('Error agregando operación:', error);
    return null;
  }
};

// ===== OBTENER OPERACIONES PENDIENTES =====
export const obtenerOperacionesPendientes = () => {
  return obtenerLocal(COLA_KEY) || [];
};

// ===== ELIMINAR OPERACIÓN =====
export const eliminarOperacion = (id) => {
  try {
    const cola = obtenerLocal(COLA_KEY) || [];
    const nuevaCola = cola.filter(op => op.id !== id);
    guardarLocal(COLA_KEY, nuevaCola);
    return true;
  } catch (error) {
    console.error('Error eliminando operación:', error);
    return false;
  }
};

// ===== ELIMINAR TODAS LAS OPERACIONES =====
export const limpiarCola = () => {
  try {
    guardarLocal(COLA_KEY, []);
    console.log('🧹 Cola limpiada');
    return true;
  } catch (error) {
    console.error('Error limpiando cola:', error);
    return false;
  }
};

// ===== EJECUTAR OPERACIÓN =====
export const ejecutarOperacion = async (operacion) => {
  try {
    console.log('🔄 Ejecutando operación:', operacion);

    // Verificar si ya fue procesada
    if (yaFueProcesada(operacion.id)) {
      console.log(`⏭️ Operación ${operacion.id} ya fue procesada, omitiendo`);
      eliminarOperacion(operacion.id);
      return { success: true, yaProcesada: true };
    }

    // Marcar como procesada ANTES de ejecutar
    marcarComoProcesada(operacion.id);

    if (operacion.tipo === 'INSERT') {
      // Para inventario, los datos son un array
      const datos = Array.isArray(operacion.datos) ? operacion.datos : [operacion.datos];
      
      const { data, error } = await supabase
        .from(operacion.tabla)
        .insert(datos)
        .select();

      if (error) {
        console.error('Error en INSERT:', error);
        return { success: false, error: error.message };
      }
      
      eliminarOperacion(operacion.id);
      console.log('✅ INSERT completado:', data);
      return { success: true, data, idReal: data?.[0]?.id };

    } else if (operacion.tipo === 'UPDATE') {
      const { data, error } = await supabase
        .from(operacion.tabla)
        .update(operacion.datos)
        .eq('id', operacion.id_registro)
        .select();

      if (error) {
        console.error('Error en UPDATE:', error);
        return { success: false, error: error.message };
      }
      
      eliminarOperacion(operacion.id);
      console.log('✅ UPDATE completado');
      return { success: true, data };

    } else if (operacion.tipo === 'DELETE') {
      const { error } = await supabase
        .from(operacion.tabla)
        .delete()
        .eq('id', operacion.id_registro);

      if (error) {
        console.error('Error en DELETE:', error);
        return { success: false, error: error.message };
      }
      
      eliminarOperacion(operacion.id);
      console.log('✅ DELETE completado');
      return { success: true };
    }

    return { success: false, error: 'Tipo no soportado' };

  } catch (error) {
    console.error('❌ Error ejecutando:', error);
    return { success: false, error: error.message };
  }
};

// ===== SINCRONIZAR INVENTARIO PENDIENTE =====
export const sincronizarInventarioPendiente = async () => {
  if (!tieneInternet()) {
    return { success: false, error: 'Sin internet' };
  }

  const operaciones = obtenerOperacionesPendientes();
  const inventariosPendientes = operaciones.filter(op => op.esInventario === true);

  if (inventariosPendientes.length === 0) {
    return { success: true, message: 'No hay inventarios pendientes' };
  }

  console.log(`📡 Sincronizando ${inventariosPendientes.length} inventarios pendientes...`);
  let exitosos = 0;

  for (const operacion of inventariosPendientes) {
    try {
      // Verificar si ya fue procesada
      if (yaFueProcesada(operacion.id)) {
        console.log(`⏭️ Operación ${operacion.id} ya fue procesada`);
        eliminarOperacion(operacion.id);
        continue;
      }

      // Marcar como procesada
      marcarComoProcesada(operacion.id);

      // Los datos pueden ser un array o un objeto
      const datos = Array.isArray(operacion.datos) ? operacion.datos : [operacion.datos];

      // Eliminar registros existentes para esta fecha
      const { error: deleteError } = await supabase
        .from(operacion.tabla)
        .delete()
        .eq('fecha', operacion.fecha || datos[0]?.fecha);

      if (deleteError) {
        console.error('Error eliminando inventario existente:', deleteError);
        continue;
      }

      // Insertar nuevos registros
      const { data, error } = await supabase
        .from(operacion.tabla)
        .insert(datos)
        .select();

      if (error) {
        console.error('Error insertando inventario:', error);
        continue;
      }

      console.log(`✅ Inventario sincronizado: ${data?.length || 0} productos`);
      eliminarOperacion(operacion.id);
      exitosos++;
    } catch (err) {
      console.error('Error sincronizando inventario:', err);
    }
  }

  return { success: true, sincronizados: exitosos };
};

// ===== SINCRONIZAR OPERACIONES =====
export const sincronizarOperaciones = async () => {
  if (!tieneInternet()) {
    return { success: false, error: 'Sin internet' };
  }

  const operaciones = obtenerOperacionesPendientes();
  if (operaciones.length === 0) {
    return { success: true, message: 'No hay operaciones' };
  }

  console.log(`📡 Sincronizando ${operaciones.length} operaciones...`);
  const resultados = [];
  let exitosas = 0;
  let fallidas = 0;

  for (const operacion of operaciones) {
    // Si es inventario, usar sincronización especial
    if (operacion.esInventario) {
      const resultado = await sincronizarInventarioPendiente();
      if (resultado.success) {
        exitosas += resultado.sincronizados || 0;
      }
      continue;
    }

    // Operaciones normales (productos, clientes, etc.)
    if (yaFueProcesada(operacion.id)) {
      console.log(`⏭️ Operación ${operacion.id} ya procesada, eliminando`);
      eliminarOperacion(operacion.id);
      continue;
    }

    const resultado = await ejecutarOperacion(operacion);
    if (resultado.success) {
      exitosas++;
    } else {
      fallidas++;
    }
    resultados.push(resultado);
  }

  console.log(`✅ Sincronización completada: ${exitosas} exitosas, ${fallidas} fallidas`);
  return { success: true, exitosas, fallidas, data: resultados };
};

// ===== ESCUCHAR CAMBIOS DE CONEXIÓN =====
export const iniciarEscuchaOffline = () => {
  let sincronizando = false;

  const handleOnline = async () => {
    if (sincronizando) return;
    sincronizando = true;
    console.log('🟢 Conexión restaurada');
    await sincronizarOperaciones();
    sincronizando = false;
  };

  window.addEventListener('online', handleOnline);
  
  if (tieneInternet()) {
    setTimeout(async () => {
      const ops = obtenerOperacionesPendientes();
      if (ops.length > 0) {
        console.log(`🔄 ${ops.length} operaciones pendientes`);
        await sincronizarOperaciones();
      }
    }, 3000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
};