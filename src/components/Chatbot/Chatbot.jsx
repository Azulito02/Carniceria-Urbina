import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../database/supabase';
import './Chatbot.css';

// ==========================================
// NORMALIZAR TEXTO (quitar acentos, minúsculas)
// ==========================================
const normalizar = (texto) => {
  return texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita acentos
};

// ==========================================
// DICCIONARIO DE INTENCIONES
// ==========================================
const INTENCIONES = {
  SALUDO: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches',
    'hey', 'saludos', 'que tal', 'hi', 'hello', 'que onda', 'holaa', 'ola'],

  DESPEDIDA: ['adios', 'chao', 'bye', 'hasta luego', 'nos vemos',
    'me voy', 'hasta pronto', 'chau', 'me despido', 'ya me voy',
    'ahi nos vemos'],

  AGRADECIMIENTO: ['gracias', 'muchas gracias', 'te agradezco', 'mil gracias',
    'thanks', 'agradecido', 'agradecida', 'graciass'],

  AYUDA: ['ayuda', 'ayudame', 'help', 'que puedes hacer',
    'que sabes hacer', 'opciones', 'comandos', 'como funciona',
    'instrucciones', 'tutorial', 'que puedo preguntar', 'que hago aqui'],

  ESTADO_ANIMO: ['como estas', 'como te va', 'como te encuentras',
    'que haces', 'como te sientes', 'como andas'],

  BROMA: ['chiste', 'broma', 'algo gracioso', 'cuentame algo',
    'dime algo', 'aburrido', 'aburrida', 'algo divertido', 'algo chistoso'],

  PROVEEDOR_PRODUCTO: ['proveedor', 'proveedores', 'a quien le compro',
    'donde compro', 'de quien compro', 'a cual proveedor',
    'que proveedor', 'quien me vende', 'quien me surte', 'quien me trae'],

  VENTAS_HOY: ['ventas de hoy', 'ventas hoy', 'vendi hoy', 'se vendio hoy',
    'se vendió hoy', 'que se vendio hoy', 'que se vendió hoy',
    'cuanto vendi hoy', 'venta del dia', 'cuanto he vendido hoy',
    'cuanto se vendio hoy', 'que vendi hoy', 'que se ha vendido hoy',
    'que hemos vendido hoy', 'ventas de hoy dia'],

  VENTAS_SEMANA: ['ventas de la semana', 'ventas semana', 'esta semana',
    'vendi esta semana', 'se vendio esta semana', 'cuanto vendi esta semana',
    'ultimos 7 dias', 'semana pasada', 'ventas semanales'],

  VENTAS_MES: ['ventas del mes', 'ventas mes', 'vendi este mes',
    'se vendio este mes', 'cuanto vendi este mes',
    'cuanto se vendio este mes', 'ventas mensuales', 'mes actual'],

  PRODUCTO_MAS_VENDIDO: ['mas vendido', 'que se vende mas',
    'que es lo que mas se vende', 'producto estrella', 'top ventas',
    'mejor vendido', 'mejores ventas', 'que producto vende mas',
    'cual se vende mas', 'ranking ventas', 'top productos',
    'que sale mas', 'que es lo que mas sale', 'cual es el mas vendido',
    'lo mas vendido', 'top 5'],

  PRODUCTO_MENOS_VENDIDO: ['menos vendido', 'menos vendidos',
    'que no se vende', 'que no se vende nada', 'producto flojo',
    'peor vendido', 'que casi no se vende', 'cual se vende menos',
    'cual es el menos vendido', 'lo menos vendido'],

  MENOR_STOCK: ['menor stock', 'menos stock', 'menor cantidad',
    'menos cantidad', 'mas bajo', 'mas bajos', 'el que tiene menos',
    'el que tiene menor', 'cual tiene menos', 'cual tiene menor',
    'cual es el que tiene menos', 'cual es el producto que tiene menos',
    'que tiene menos stock', 'que tiene menor stock', 'los mas bajos',
    'que esta mas bajo', 'que producto tiene menos'],

  RECOMENDAR_COMPRA: ['comprar', 'compra', 'conviene', 'recomien',
    'recomend', 'abastecer', 'abastezca', 'pedir', 'surtir', 'surtido',
    'proximo mes', 'reponer', 'reposicion', 'bajo stock', 'stock bajo',
    'poco stock', 'falta', 'faltan', 'faltante', 'agotar', 'agotado',
    'escaso', 'escasez', 'minimo', 'que me falta', 'que falta',
    'que hay que pedir', 'que compro', 'sugerencia', 'sugerir',
    'sugiereme', 'aconseja', 'aconsejame', 'cual compro',
    'que debo comprar', 'que necesito comprar'],

  CONSULTAR_PRODUCTO: ['cuanto queda', 'cuanto hay', 'cuanto tiene',
    'cuanto stock', 'stock de', 'inventario de', 'existencia',
    'existencias', 'disponible', 'disponibles', 'hay de', 'queda de',
    'tienes de', 'cantidad de', 'cuantas', 'cuantos'],

  LISTAR_TODO: ['todos', 'todo', 'lista', 'listar', 'listado',
    'muestra', 'muestrame', 'mostrar', 'inventario completo',
    'productos', 'ver productos', 'dame', 'ensename', 'catalogo',
    'ranking completo', 'todos los productos', 'que productos',
    'que tengo', 'que hay en inventario', 'inventario'],

  ESTADO_GENERAL: ['como va', 'como esta', 'estado', 'resumen',
    'panorama', 'situacion', 'como va todo', 'como andamos',
    'reporte', 'dame un resumen', 'analisis', 'que tal todo',
    'como va el negocio'],

  PRODUCTOS_AGOTADOS: ['agotado', 'agotados', 'sin stock', 'no hay',
    'cero', 'que no hay', 'que se acabo', 'vacios'],

  STOCK_CRITICO: ['critico', 'alerta', 'emergencia', 'problema',
    'grave', 'peligro', 'al borde', 'criticos', 'urgente'],

  LISTAR_PROVEEDORES: [
    'mis proveedores', 'lista de proveedores', 'todos los proveedores',
    'que proveedores tengo', 'que proveedores hay', 'cuantos proveedores',
    'ver proveedores', 'muestrame proveedores', 'muéstrame proveedores',
    'cuales son los proveedores', 'cuáles son los proveedores',
    'cuales proveedores tengo', 'proveedores tengo', 'lista proveedores',
    'dame los proveedores', 'ver todos los proveedores',
    'cuales son mis proveedores', 'cuáles son mis proveedores',
    'que proveedores', 'muestrame la lista de proveedores'
  ]
};

// ==========================================
// RESPUESTAS VARIADAS + PREFIJOS
// ==========================================
const PREFIJOS = {
  INVENTARIO: ['📦', '🔎', '📊', '👀', ''],
  VENTAS: ['💰', '📈', '🛒', '📊', ''],
  LISTA: ['📋', '📄', '🗒️', ''],
  ALERTA: ['⚠️', '🚨', '❗', '']
};

const RESPUESTAS_VARIADAS = {
  SALUDO: [
    '¡Pío pío! 🐥 ¿En qué te ayudo hoy?',
    '¡Hola humano o vendedor! 👋 ¿Qué necesita mi carnicería favorita?',
    '¡Pío pío! 🐣 ¿Qué averiguamos hoy?',
    '¡Hey! 🐥 Aquí ando listo para lo que sea.'
  ],
  DESPEDIDA: [
    '¡Pío pío, hasta luego! 👋',
    '¡Adiós! Vuelve cuando quieras 🐥',
    '¡Nos vemos! Aquí estaré picoteando datos 🐣',
    '¡Chao! Éxito con las ventas 🐥'
  ],
  AGRADECIMIENTO: [
    '¡De nada! 😊 Pío pío 🐥',
    '¡Con gusto! ¿Algo más? 🐤',
    '¡Un placer ayudar! 🙌 🐥',
    '¡Pío pío! Aquí estoy para servirte 🐣'
  ],
  ESTADO_ANIMO: [
    '¡Pío pío! Muy bien 💪 ¿Qué necesitas?',
    '¡Excelente! 🐥 Listo para picotear datos.',
    '¡De maravilla! ¿En qué te ayudo? 🐤'
  ],
  BROMA: [
    '🐥 ¿Por qué el pollito cruzó la carnicería? ¡Para llegar al otro lado! 😄',
    '🍗 ¿Qué dijo un pollito a otro? ¡Pío pío pío! (es su idioma, no traduzco) 😂',
    '🥚 ¿Por qué el huevo fue al médico? Porque se sentía "cascarrabias". 😅',
    '🐣 ¿Cómo se despide un pollito elegante? ¡"Pío luego"! 💪'
  ]
};

const SEGUIMIENTOS = [
  '\n\n🐥 ¿Algo más en lo que pueda picotear?',
  '\n\n🐣 ¿Quieres saber algo más?',
  '\n\n🥚 ¿Necesitas otro dato?',
  '\n\n🐤 ¿Te ayudo con algo más?',
  '\n\n✨ ¿Hay algo más que quieras consultar?',
  '\n\n👉 ¿Seguimos? Pregúntame otra cosa 🐥'
];

const respuestaAleatoria = (arr) => arr[Math.floor(Math.random() * arr.length)];
const seguimientoAleatorio = () => respuestaAleatoria(SEGUIMIENTOS);

// ==========================================
// DETECCIÓN DE INTENCIONES (con texto normalizado)
// ==========================================
const contarCoincidencias = (texto, palabrasClave) => {
  let contador = 0;
  const encontradas = [];
  palabrasClave.forEach(palabra => {
    const palabraNorm = normalizar(palabra);
    if (texto.includes(palabraNorm)) {
      contador++;
      encontradas.push(palabra);
    }
  });
  return { contador, encontradas };
};

const detectarIntencion = (textoOriginal) => {
  const texto = normalizar(textoOriginal);
  let mejorIntencion = 'DESCONOCIDA';
  let mejorPuntaje = 0;
  let palabrasEncontradas = [];

  Object.entries(INTENCIONES).forEach(([intencion, palabras]) => {
    const { contador, encontradas } = contarCoincidencias(texto, palabras);
    if (contador > mejorPuntaje) {
      mejorPuntaje = contador;
      mejorIntencion = intencion;
      palabrasEncontradas = encontradas;
    }
  });

  return { intencion: mejorIntencion, puntaje: mejorPuntaje, palabras: palabrasEncontradas };
};

// ==========================================
// HELPERS DE FECHAS
// ==========================================
const rangoHoy = () => {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
};

const rangoSemana = () => {
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 7);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);
  return { inicio, fin };
};

const rangoMes = () => {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
  return { inicio, fin };
};

const formatearMonto = (n) =>
  new Intl.NumberFormat('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n || 0);

// ==========================================
// COMPONENTE
// ==========================================
const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mensajes, setMensajes] = useState([
    {
      autor: 'bot',
      texto: '¡Pío pío! 🐥 Soy Piolín, tu pollito asistente.\n\nPuedo ayudarte con:\n• "¿Qué me conviene comprar?"\n• "¿Cuál tiene menor stock?"\n• "¿A qué proveedor le compro [producto]?"\n• "¿Qué se vendió hoy?"\n• "¿Qué se vende más?"\n\n¿Qué necesitas saber? 🐣'
    }
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const toggleChat = () => setIsOpen(!isOpen);

  // ==========================================
  // OBTENER PRODUCTOS CON INVENTARIO REAL
  // ==========================================
  const obtenerTodosLosProductos = async () => {
    const { data: stockData, error: errStock } = await supabase
      .from('stock_actual')
      .select('producto_id, nombre, unidad_medida, stock_disponible, stock_minimo');

    if (errStock) throw errStock;
    if (!stockData || stockData.length === 0) return [];

    const { data: productosData, error: errProd } = await supabase
      .from('productos')
      .select('id, categoria');

    if (errProd) console.warn('Advertencia cargando productos:', errProd);

    const catMap = {};
    (productosData || []).forEach(p => {
      catMap[p.id] = p.categoria || 'otros';
    });

    return stockData.map(s => ({
      id: s.producto_id,
      nombre: s.nombre || `Producto ${s.producto_id}`,
      categoria: catMap[s.producto_id] || 'otros',
      unidad: s.unidad_medida || 'unidades',
      stock: parseFloat(s.stock_disponible) || 0,
      stockMinimo: parseFloat(s.stock_minimo) || 0
    }));
  };

  const obtenerStockProductos = async () => {
    return await obtenerTodosLosProductos();
  };

  // ==========================================
  // BUSCAR PRODUCTO EN EL TEXTO
  // ==========================================
  const buscarProducto = (txt, productos) => {
    const txtNorm = normalizar(txt);
    let encontrado = null;
    let mejorCoincidencia = 0;

    productos.forEach(p => {
      const nombreNorm = normalizar(p.nombre);
      if (txtNorm.includes(nombreNorm)) {
        if (nombreNorm.length > mejorCoincidencia) {
          mejorCoincidencia = nombreNorm.length;
          encontrado = p;
        }
      } else {
        const palabrasProducto = nombreNorm.split(/\s+/).filter(w => w.length > 3);
        const coincidencias = palabrasProducto.filter(pal => txtNorm.includes(pal));
        if (coincidencias.length >= 2 && coincidencias.length > mejorCoincidencia) {
          mejorCoincidencia = coincidencias.length;
          encontrado = p;
        }
      }
    });

    return encontrado;
  };

  // ==========================================
  // PROVEEDORES DE UN PRODUCTO (robusta)
  // ==========================================
  const obtenerProveedoresDeProducto = async (productoId) => {
    const { data: invData, error: errInv } = await supabase
      .from('inversiones')
      .select('proveedor_id, fecha, cantidad, monto')
      .eq('producto_id', productoId)
      .order('fecha', { ascending: false });

    if (errInv) {
      console.error('Error cargando inversiones:', errInv);
      return [];
    }

    if (!invData || invData.length === 0) return [];

    const provIds = [...new Set(invData.map(i => i.proveedor_id).filter(Boolean))];
    if (provIds.length === 0) return [];

    const { data: provData, error: errProv } = await supabase
      .from('proveedores')
      .select('*')
      .in('id', provIds);

    if (errProv) {
      console.error('Error cargando proveedores:', errProv);
      return [];
    }

    if (!provData || provData.length === 0) return [];

    console.log('📋 Columnas reales de proveedores:', Object.keys(provData[0]));
    console.log('📋 Ejemplo de proveedor:', provData[0]);

    const extraerNombre = (prov) => {
      const posiblesColumnas = [
        'nombre', 'empresa', 'razon_social', 'razón_social',
        'name', 'nombre_empresa', 'nombre_proveedor',
        'proveedor', 'company', 'title', 'label'
      ];
      for (const col of posiblesColumnas) {
        if (prov[col] && typeof prov[col] === 'string' && prov[col].trim()) {
          return prov[col];
        }
      }
      const ignorar = ['id', 'created_at', 'updated_at', 'fecha', 'activo'];
      for (const key of Object.keys(prov)) {
        if (!ignorar.includes(key) && typeof prov[key] === 'string' && prov[key].trim() && prov[key].length > 1) {
          return prov[key];
        }
      }
      return `Proveedor #${prov.id}`;
    };

    const extraerVendedor = (prov) => {
      const cols = ['vendedor', 'contacto', 'representante', 'encargado', 'vendor'];
      for (const col of cols) {
        if (prov[col] && typeof prov[col] === 'string' && prov[col].trim()) return prov[col];
      }
      return null;
    };

    const extraerTelefono = (prov) => {
      const cols = ['telefono', 'teléfono', 'celular', 'phone', 'whatsapp', 'movil'];
      for (const col of cols) {
        if (prov[col] && typeof prov[col] === 'string' && prov[col].trim()) return prov[col];
      }
      return null;
    };

    return provIds.map(id => {
      const prov = provData.find(p => p.id === id);
      if (!prov) return null;
      const compras = invData.filter(i => i.proveedor_id === id);
      return {
        id,
        nombre: extraerNombre(prov),
        telefono: extraerTelefono(prov),
        vendedor: extraerVendedor(prov),
        veces: compras.length,
        ultimaCompra: compras[0]?.fecha
      };
    }).filter(Boolean).sort((a, b) => b.veces - a.veces);
  };

  // ==========================================
  // LÓGICA PRINCIPAL
  // ==========================================
  const procesarPregunta = async (texto) => {
    setCargando(true);

    try {
      const { intencion, puntaje, palabras } = detectarIntencion(texto);
      console.log('🎯 Intención:', intencion, '| Puntaje:', puntaje, '| Palabras:', palabras);

      // --- RESPUESTAS RÁPIDAS ---
      if (intencion === 'SALUDO' && puntaje > 0) return respuestaAleatoria(RESPUESTAS_VARIADAS.SALUDO);
      if (intencion === 'DESPEDIDA' && puntaje > 0) return respuestaAleatoria(RESPUESTAS_VARIADAS.DESPEDIDA);
      if (intencion === 'AGRADECIMIENTO' && puntaje > 0) return respuestaAleatoria(RESPUESTAS_VARIADAS.AGRADECIMIENTO);
      if (intencion === 'ESTADO_ANIMO' && puntaje > 0) return respuestaAleatoria(RESPUESTAS_VARIADAS.ESTADO_ANIMO);
      if (intencion === 'BROMA' && puntaje > 0) return respuestaAleatoria(RESPUESTAS_VARIADAS.BROMA) + seguimientoAleatorio();
      if (intencion === 'AYUDA' && puntaje > 0) {
        return '🐥 ¡Pío pío! Esto es lo que puedo hacer:\n\n📦 INVENTARIO:\n• "¿Qué me conviene comprar?"\n• "¿Cuál tiene menor stock?"\n• "¿Cuánto queda de [producto]?"\n• "Muéstrame el inventario"\n\n🏭 PROVEEDORES:\n• "¿A qué proveedor le compro [producto]?"\n• "¿Cuáles son mis proveedores?"\n\n💰 VENTAS:\n• "¿Qué se vendió hoy?"\n• "Ventas de la semana"\n• "¿Qué se vende más?"\n\n📊 ANÁLISIS:\n• "¿Cómo va todo?"\n• "¿Qué está agotado?"\n\n💬 CONVERSACIÓN:\n• "Cuéntame un chiste"\n\n¿Qué te gustaría saber? 🐣';
      }

      // --- CONSULTAS A BD ---
      const productos = await obtenerTodosLosProductos();
      const productoMencionado = buscarProducto(texto, productos);

      // --- LISTAR TODOS LOS PROVEEDORES ---
      if (intencion === 'LISTAR_PROVEEDORES' && puntaje > 0) {
        const { data: provData, error: errProv } = await supabase
          .from('proveedores')
          .select('*');

        if (errProv) throw errProv;

        if (!provData || provData.length === 0) {
          return '🏭 No tienes proveedores registrados.' + seguimientoAleatorio();
        }

        const columnas = Object.keys(provData[0]);
        const colNombre = columnas.find(c =>
          ['nombre', 'empresa', 'razon_social', 'razón_social', 'name'].includes(c)
        ) || columnas.find(c =>
          c !== 'id' && c !== 'created_at' &&
          typeof provData[0][c] === 'string' && provData[0][c].trim()
        ) || 'nombre';

        const colVendedor = columnas.find(c =>
          ['vendedor', 'contacto', 'representante'].includes(c)
        );

        const colTelefono = columnas.find(c =>
          ['telefono', 'teléfono', 'celular', 'phone'].includes(c)
        );

        let respuesta = `🏭 Tienes ${provData.length} proveedores:\n\n`;
        provData.forEach((p, i) => {
          const nombre = p[colNombre] || `Proveedor #${p.id}`;
          respuesta += `${i + 1}. ${nombre}`;
          if (colVendedor && p[colVendedor]) respuesta += ` — 👤 ${p[colVendedor]}`;
          if (colTelefono && p[colTelefono]) respuesta += ` — 📞 ${p[colTelefono]}`;
          respuesta += '\n';
        });
        return respuesta + seguimientoAleatorio();
      }

      // --- PROVEEDOR DE UN PRODUCTO ---
      if (intencion === 'PROVEEDOR_PRODUCTO' && puntaje > 0) {
        if (!productoMencionado) {
          return '🏭 ¿De qué producto? Dime por ejemplo: "¿A qué proveedor le compro carne molida?"';
        }

        const proveedores = await obtenerProveedoresDeProducto(productoMencionado.id);

        if (proveedores.length === 0) {
          return `📭 No tengo registro de proveedores para "${productoMencionado.nombre}".${seguimientoAleatorio()}`;
        }

        let respuesta = `🏭 Proveedores de "${productoMencionado.nombre}":\n\n`;
        proveedores.forEach((p, i) => {
          respuesta += `${i + 1}. ${p.nombre}\n`;
          if (p.vendedor) respuesta += `   👤 Vendedor: ${p.vendedor}\n`;
          if (p.telefono) respuesta += `   📞 ${p.telefono}\n`;
          respuesta += `   🔄 ${p.veces} compra(s)\n`;
        });
        return respuesta + seguimientoAleatorio();
      }

      // --- CONSULTA ESPECÍFICA DE PRODUCTO ---
      if (
        productoMencionado &&
        intencion !== 'VENTAS_HOY' &&
        intencion !== 'VENTAS_SEMANA' &&
        intencion !== 'VENTAS_MES' &&
        intencion !== 'PRODUCTO_MAS_VENDIDO' &&
        intencion !== 'PRODUCTO_MENOS_VENDIDO'
      ) {
        const p = productoMencionado;
        const alerta = p.stock <= 0 ? '\n\n⚠️ ¡AGOTADO!' :
                       p.stock <= p.stockMinimo ? '\n\n⚠️ Por debajo del mínimo.' : '';
        return `${respuestaAleatoria(PREFIJOS.INVENTARIO)} "${p.nombre}" tiene ${p.stock} ${p.unidad}.${alerta}${seguimientoAleatorio()}`;
      }

      // --- VENTAS DE HOY ---
      if (intencion === 'VENTAS_HOY' && puntaje > 0) {
        const { inicio, fin } = rangoHoy();
        const { data, error } = await supabase
          .from('ventas')
          .select('numero_factura, total, cantidad, estado')
          .gte('fecha', inicio.toISOString())
          .lt('fecha', fin.toISOString());

        if (error) throw error;

        const validas = (data || []).filter(v => !['anulada', 'cancelada'].includes(v.estado));
        const total = validas.reduce((s, v) => s + (parseFloat(v.total) || 0), 0);
        const facturas = new Set(validas.map(v => v.numero_factura)).size;
        const unidades = validas.reduce((s, v) => s + (parseFloat(v.cantidad) || 0), 0);

        if (validas.length === 0) {
          return '📭 Aún no hay ventas registradas hoy.' + seguimientoAleatorio();
        }

        const intro = respuestaAleatoria(['💰', '📈', '🛒']);
        return `${intro} VENTAS DE HOY:\n\n` +
          `• Total: C$ ${formatearMonto(total)}\n` +
          `• Facturas: ${facturas}\n` +
          `• Unidades vendidas: ${unidades.toFixed(2)}` + seguimientoAleatorio();
      }

      // --- VENTAS DE LA SEMANA ---
      if (intencion === 'VENTAS_SEMANA' && puntaje > 0) {
        const { inicio, fin } = rangoSemana();
        const { data, error } = await supabase
          .from('ventas')
          .select('total, estado')
          .gte('fecha', inicio.toISOString())
          .lte('fecha', fin.toISOString());

        if (error) throw error;

        const validas = (data || []).filter(v => !['anulada', 'cancelada'].includes(v.estado));
        const total = validas.reduce((s, v) => s + (parseFloat(v.total) || 0), 0);

        return `📅 VENTAS ÚLTIMOS 7 DÍAS:\n\n` +
          `• Total: C$ ${formatearMonto(total)}\n` +
          `• Registros: ${validas.length}` + seguimientoAleatorio();
      }

      // --- VENTAS DEL MES ---
      if (intencion === 'VENTAS_MES' && puntaje > 0) {
        const { inicio, fin } = rangoMes();
        const { data, error } = await supabase
          .from('ventas')
          .select('total, estado')
          .gte('fecha', inicio.toISOString())
          .lte('fecha', fin.toISOString());

        if (error) throw error;

        const validas = (data || []).filter(v => !['anulada', 'cancelada'].includes(v.estado));
        const total = validas.reduce((s, v) => s + (parseFloat(v.total) || 0), 0);

        return `📆 VENTAS DEL MES:\n\n` +
          `• Total: C$ ${formatearMonto(total)}\n` +
          `• Registros: ${validas.length}` + seguimientoAleatorio();
      }

      // --- PRODUCTO MÁS VENDIDO ---
      if (intencion === 'PRODUCTO_MAS_VENDIDO' && puntaje > 0) {
        const { data, error } = await supabase
          .from('ventas')
          .select('producto_id, cantidad, total, estado')
          .gte('fecha', rangoMes().inicio.toISOString());

        if (error) throw error;

        const validas = (data || []).filter(v => !['anulada', 'cancelada'].includes(v.estado));

        const porProducto = {};
        validas.forEach(v => {
          if (!porProducto[v.producto_id]) {
            porProducto[v.producto_id] = { cantidad: 0, total: 0 };
          }
          porProducto[v.producto_id].cantidad += parseFloat(v.cantidad) || 0;
          porProducto[v.producto_id].total += parseFloat(v.total) || 0;
        });

        const ranking = Object.entries(porProducto)
          .map(([id, stats]) => {
            const prod = productos.find(p => p.id === parseInt(id));
            return {
              nombre: prod?.nombre || `Producto #${id}`,
              unidad: prod?.unidad || 'unidades',
              ...stats
            };
          })
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 5);

        if (ranking.length === 0) return '📭 No hay ventas registradas este mes.' + seguimientoAleatorio();

        let respuesta = '🏆 TOP 5 MÁS VENDIDOS (este mes):\n\n';
        ranking.forEach((p, i) => {
          const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          respuesta += `${medalla} ${p.nombre}: ${p.cantidad.toFixed(2)} ${p.unidad} | C$ ${formatearMonto(p.total)}\n`;
        });
        return respuesta + seguimientoAleatorio();
      }

      // --- PRODUCTO MENOS VENDIDO ---
      if (intencion === 'PRODUCTO_MENOS_VENDIDO' && puntaje > 0) {
        const { data, error } = await supabase
          .from('ventas')
          .select('producto_id, cantidad, total, estado')
          .gte('fecha', rangoMes().inicio.toISOString());

        if (error) throw error;

        const validas = (data || []).filter(v => !['anulada', 'cancelada'].includes(v.estado));

        const porProducto = {};
        validas.forEach(v => {
          if (!porProducto[v.producto_id]) {
            porProducto[v.producto_id] = { cantidad: 0, total: 0 };
          }
          porProducto[v.producto_id].cantidad += parseFloat(v.cantidad) || 0;
          porProducto[v.producto_id].total += parseFloat(v.total) || 0;
        });

        const ranking = Object.entries(porProducto)
          .map(([id, stats]) => {
            const prod = productos.find(p => p.id === parseInt(id));
            return {
              nombre: prod?.nombre || `Producto #${id}`,
              unidad: prod?.unidad || 'unidades',
              ...stats
            };
          })
          .sort((a, b) => a.cantidad - b.cantidad)
          .slice(0, 5);

        if (ranking.length === 0) return '📭 No hay ventas registradas este mes.' + seguimientoAleatorio();

        let respuesta = '📉 TOP 5 MENOS VENDIDOS (este mes):\n\n';
        ranking.forEach((p, i) => {
          respuesta += `${i + 1}. ${p.nombre}: ${p.cantidad.toFixed(2)} ${p.unidad}\n`;
        });
        return respuesta + seguimientoAleatorio();
      }

      // --- MENOR STOCK ---
      if (intencion === 'MENOR_STOCK' && puntaje > 0) {
        const ordenados = [...productos].sort((a, b) => a.stock - b.stock);
        const menor = ordenados[0];
        const top5 = ordenados.slice(0, 5);

        let respuesta = `📉 El producto con MENOR stock es:\n\n`;
        respuesta += `🥇 ${menor.nombre}: ${menor.stock} ${menor.unidad}\n\n`;
        respuesta += `Top 5 con menos stock:\n`;
        top5.forEach((p, i) => {
          respuesta += `${i + 1}. ${p.nombre}: ${p.stock} ${p.unidad}\n`;
        });
        return respuesta + seguimientoAleatorio();
      }

      // --- RECOMENDAR COMPRA ---
      if (intencion === 'RECOMENDAR_COMPRA' && puntaje > 0) {
        const productosBajos = productos
          .filter(p => {
            const minimo = p.stockMinimo > 0 ? p.stockMinimo : 20;
            return p.stock <= minimo;
          })
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 10);

        if (productosBajos.length === 0) {
          const menor = [...productos].sort((a, b) => a.stock - b.stock)[0];
          return `✅ Todos tus productos tienen stock suficiente.\n\n💡 Aunque el que tiene menos es:\n• ${menor.nombre}: ${menor.stock} ${menor.unidad}` + seguimientoAleatorio();
        }

        let respuesta = '🛒 Productos que te recomiendo abastecer:\n\n';
        productosBajos.forEach((p, i) => {
          const alerta = p.stock <= 0 ? ' ⚠️ AGOTADO' : '';
          respuesta += `${i + 1}. ${p.nombre}: ${p.stock} ${p.unidad}${alerta}\n`;
        });
        return respuesta + seguimientoAleatorio();
      }

      // --- AGOTADOS ---
      if (intencion === 'PRODUCTOS_AGOTADOS' && puntaje > 0) {
        const agotados = productos.filter(p => p.stock <= 0);
        if (agotados.length === 0) return '✅ ¡No hay productos agotados!' + seguimientoAleatorio();
        let respuesta = `❌ Productos AGOTADOS (${agotados.length}):\n\n`;
        agotados.forEach((p, i) => {
          respuesta += `${i + 1}. ${p.nombre}\n`;
        });
        return respuesta + seguimientoAleatorio();
      }

      // --- STOCK CRÍTICO ---
      if (intencion === 'STOCK_CRITICO' && puntaje > 0) {
        const criticos = productos.filter(p => p.stock > 0 && p.stock <= 5);
        if (criticos.length === 0) return '✅ No hay productos en estado crítico.' + seguimientoAleatorio();
        let respuesta = `🚨 Productos CRÍTICOS (≤5):\n\n`;
        criticos.forEach((p, i) => {
          respuesta += `${i + 1}. ${p.nombre}: ${p.stock} ${p.unidad}\n`;
        });
        return respuesta + seguimientoAleatorio();
      }

      // --- ESTADO GENERAL ---
      if (intencion === 'ESTADO_GENERAL' && puntaje > 0) {
        const total = productos.length;
        const agotados = productos.filter(p => p.stock <= 0).length;
        const criticos = productos.filter(p => p.stock > 0 && p.stock <= 5).length;
        const bajos = productos.filter(p => p.stock > 5 && p.stock <= 20).length;
        const ok = productos.filter(p => p.stock > 20).length;
        const stockTotal = productos.reduce((sum, p) => sum + p.stock, 0);
        const menor = [...productos].sort((a, b) => a.stock - b.stock)[0];

        return `📊 RESUMEN DEL INVENTARIO:\n\n` +
          `• Total productos: ${total}\n` +
          `• Stock total: ${stockTotal.toFixed(2)} unidades\n\n` +
          `Estado:\n` +
          `✅ Suficiente: ${ok}\n` +
          `⚠️ Bajo: ${bajos}\n` +
          `🚨 Crítico: ${criticos}\n` +
          `❌ Agotados: ${agotados}\n\n` +
          `📉 Menor stock: ${menor.nombre} (${menor.stock} ${menor.unidad})` + seguimientoAleatorio();
      }

      // --- LISTAR TODO ---
      if (intencion === 'LISTAR_TODO' && puntaje > 0) {
        if (productos.length === 0) return 'No hay productos registrados.' + seguimientoAleatorio();
        let respuesta = `📋 Inventario (${productos.length} productos):\n\n`;
        [...productos]
          .sort((a, b) => a.stock - b.stock)
          .forEach((p, i) => {
            const alerta = p.stock <= 0 ? ' ❌' : p.stock <= 5 ? ' 🚨' : p.stock <= 20 ? ' ⚠️' : ' ✅';
            respuesta += `${i + 1}. ${p.nombre}: ${p.stock} ${p.unidad}${alerta}\n`;
          });
        return respuesta + seguimientoAleatorio();
      }

      // --- FALLBACK AMIGABLE ---
      if (productos.length > 0) {
        const topBajos = [...productos].sort((a, b) => a.stock - b.stock).slice(0, 5);
        return '🐥 Pío... no entendí bien tu pregunta.\n\n💡 Prueba algo como:\n• "¿Cuál tiene menor stock?"\n• "¿Qué me conviene comprar?"\n• "¿Qué se vendió hoy?"\n• "¿A qué proveedor le compro carne molida?"\n\nMientras tanto, mira los 5 con menos stock:\n\n' +
          topBajos.map((p, i) => `${i + 1}. ${p.nombre}: ${p.stock} ${p.unidad}`).join('\n');
      }

      return '🤔 No entendí. Escribe "ayuda" para ver qué puedo hacer.';

    } catch (error) {
      console.error('Error en chatbot:', error);
      const msg = error?.message || '';
      if (msg.includes('does not exist')) {
        return '⚠️ Falta la vista "stock_actual" o la tabla "proveedores".';
      }
      return '❌ Error al consultar la base de datos. Intenta de nuevo.';
    } finally {
      setCargando(false);
    }
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!input.trim() || cargando) return;

    const textoUsuario = input;
    setMensajes(prev => [...prev, { autor: 'user', texto: textoUsuario }]);
    setInput('');

    setTimeout(async () => {
      const respuestaBot = await procesarPregunta(textoUsuario);
      setMensajes(prev => [...prev, { autor: 'bot', texto: respuestaBot }]);
    }, 500);
  };

  return (
    <div className="chatbot-container">
      <button
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        aria-label="Abrir chat"
        style={{ fontSize: isOpen ? '28px' : '34px' }}
      >
        {isOpen ? '✕' : '🐥'}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>
              <span className="pollito-avatar">🐣</span>
              Piolín — Tu Asistente
            </h3>
          </div>

          <div className="chatbot-messages">
            {mensajes.map((msg, index) => (
              <div key={index} className={`message ${msg.autor}`}>
                <div className="message-content">
                  {msg.texto.split('\n').map((linea, i) => (
                    <span key={i}>{linea}<br /></span>
                  ))}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="message bot">
                <div className="message-content typing">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input" onSubmit={handleEnviar}>
            <input
              type="text"
              placeholder="Escribe tu pregunta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={cargando}
            />
            <button type="submit" disabled={cargando || !input.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;