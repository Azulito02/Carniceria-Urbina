// src/utils/storage.js

export const guardarLocal = (key, data) => {
  try {
    if (data && (Array.isArray(data) || typeof data === 'object')) {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error guardando en localStorage:', error);
    return false;
  }
};

export const obtenerLocal = (key) => {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo de localStorage:', error);
    return null;
  }
};

export const eliminarLocal = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error eliminando de localStorage:', error);
    return false;
  }
};

export const tieneInternet = () => {
  return navigator.onLine;
};

export const obtenerUltimaActualizacion = (key) => {
  try {
    const timestamp = localStorage.getItem(`${key}_timestamp`);
    return timestamp ? new Date(parseInt(timestamp)) : null;
  } catch (error) {
    return null;
  }
};

export const guardarTimestamp = (key) => {
  try {
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());
  } catch (error) {
    console.error('Error guardando timestamp:', error);
  }
};