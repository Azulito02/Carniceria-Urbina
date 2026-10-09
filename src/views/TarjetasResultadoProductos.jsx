import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../database/supabase';
import './TarjetasResultadoProductos.css';

// ============================================================
// CONFIGURACIÓN
// ============================================================
const COLUMNA_MONTO = 'monto';
const COLUMNA_CANTIDAD = 'cantidad';
const TIPOS_VENTA = ['venta', 'credito'];
const ESTADOS_EXCLUIDOS = ['anulada', 'cancelada'];

const UNIDADES = { libra: 'lb', kilogramo: 'kg', unidad: 'und' };
const unidadCorta = (u) => UNIDADES[(u || '').toLowerCase()] || u || '';

const dinero = (n) =>
  `C$${new Intl.NumberFormat('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n || 0)}`;

const numero = (n) =>
  new Intl.NumberFormat('es-NI', { maximumFractionDigits: 2 }).format(n || 0);

const traerTodo = async (construir) => {
  const filas = [];
  const TAM = 1000;
  let desde = 0;
  while (true) {
    const { data, error } = await construir().range(desde, desde + TAM - 1);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < TAM) break;
    desde += TAM;
  }
  return filas;
};

const ETIQUETAS = {
  ganancia: { texto: 'Ganancia', icono: 'fa-arrow-trend-up' },
  perdida: { texto: 'Pérdida', icono: 'fa-arrow-trend-down' },
  equilibrio: { texto: 'Sin ganancia', icono: 'fa-equals' },
  'sin-ventas': { texto: 'Sin ventas aún', icono: 'fa-hourglass-half' },
  'sin-datos': { texto: 'Falta cantidad', icono: 'fa-circle-question' }
};

const PRIORIDAD = { perdida: 0, 'sin-datos': 1, equilibrio: 2, 'sin-ventas': 3, ganancia: 4 };

// ============================================================
// COMPONENTE
// ============================================================
const TarjetasResultadoProductos = ({ version = 0 }) => {
  console.log('🎯 [TarjetasResultadoProductos] COMPONENTE MONTADO - version:', version);

  const [tarjetas, setTarjetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const temporizador = useRef(null);

  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(null);

  const cargar = useCallback(async () => {
    console.log('🚀 [cargar] INICIANDO CARGA DE TARJETAS...');
    try {
      setError(null);

      // ===== 1) Inversiones =====
      const inversiones = await traerTodo(() =>
        supabase
          .from('inversiones')
          .select(`id, fecha, producto_id, ${COLUMNA_CANTIDAD}, ${COLUMNA_MONTO}`)
          .not('producto_id', 'is', null)
          .order('id')
      );

      console.log('📥 [cargar] Inversiones traídas:', inversiones.length);

      if (inversiones.length === 0) {
        console.log('⚠️ [cargar] No hay inversiones con producto_id');
        setTarjetas([]);
        return;
      }

      const ids = [...new Set(inversiones.map(i => i.producto_id))];
      console.log('🔍 [cargar] IDs de producto en inversiones:', ids);

      // ===== 2) Productos + Ventas desde DOS fuentes =====
      const [resProductos, ventasActivas, ventasFacturadas] = await Promise.all([
        supabase.from('productos').select('id, nombre, unidad_medida').in('id', ids),

        // 🔵 Ventas activas → tabla "ventas"
        traerTodo(() =>
          supabase
            .from('ventas')
            .select('id, producto_id, cantidad, total, fecha, estado, numero_factura')
            .order('id')
        ),

        // 🟢 Ventas facturadas → tabla "facturados"
        traerTodo(() =>
          supabase
            .from('facturados')
            .select('id, tipo, fecha, producto_id, monto, detalle')
            .in('tipo', TIPOS_VENTA)
            .order('id')
        )
      ]);

      if (resProductos.error) throw resProductos.error;

      // 🚨 LOGS DE DIAGNÓSTICO
      console.log('═══════════════════════════════════════════');
      console.log('🔍 IDs DE INVERSIONES:', ids);
      console.log('🔵 VENTAS ACTIVAS (total traídas):', ventasActivas.length);
      console.log('🟢 VENTAS FACTURADAS (total traídas):', ventasFacturadas.length);

      if (ventasActivas.length > 0) {
        console.log('📋 Muestra de ventas activas:');
        console.table(ventasActivas.slice(0, 10).map(v => ({
          id: v.id,
          producto_id: v.producto_id,
          cantidad: v.cantidad,
          total: v.total,
          estado: v.estado
        })));
      }

      if (ventasFacturadas.length > 0) {
        console.log('📋 Muestra de ventas facturadas:');
        console.table(ventasFacturadas.slice(0, 10).map(v => ({
          id: v.id,
          tipo: v.tipo,
          producto_id: v.producto_id,
          monto: v.monto,
          cantidad: v.detalle?.cantidad,
          estado: v.detalle?.estado
        })));
      }
      console.log('═══════════════════════════════════════════');

      // ===== 3) Normalizar ambas fuentes =====
      const ventasNormalizadas = [
        ...ventasActivas.map(v => ({
          origen: 'ventas',
          id: `v_${v.id}`,
          producto_id: v.producto_id,
          cantidad: parseFloat(v.cantidad) || 0,
          monto: parseFloat(v.total) || 0,
          fecha: v.fecha,
          estado: (v.estado || '').toLowerCase().trim()
        })),

        ...ventasFacturadas.map(v => ({
          origen: 'facturados',
          id: `f_${v.id}`,
          producto_id: v.producto_id,
          cantidad: parseFloat(v.detalle?.cantidad) || 0,
          monto: parseFloat(v.monto) || 0,
          fecha: v.fecha || v.detalle?.fecha,
          estado: (v.detalle?.estado || '').toLowerCase().trim(),
          tipo: (v.tipo || '').toLowerCase()
        }))
      ];

      // ===== 4) Cálculos por producto =====
      const resultado = ids.map(id => {
        const producto = (resProductos.data || []).find(p => p.id === id);
        const compras = inversiones.filter(i => i.producto_id === id);

        const invertido = compras.reduce((s, c) => s + (parseFloat(c[COLUMNA_MONTO]) || 0), 0);
        const comprado = compras.reduce((s, c) => s + (parseFloat(c[COLUMNA_CANTIDAD]) || 0), 0);

        // Cruce por producto_id
        const ventasProducto = ventasNormalizadas.filter(v => {
          if (Number(v.producto_id) !== Number(id)) return false;
          if (ESTADOS_EXCLUIDOS.includes(v.estado)) return false;
          return true;
        });

        const vendido = ventasProducto.reduce((s, v) => s + v.cantidad, 0);
        const ingresos = ventasProducto.reduce((s, v) => s + v.monto, 0);

        const costoUnitario = comprado > 0 ? invertido / comprado : 0;
        const vendidoConCosto = Math.min(vendido, comprado);
        const ingresosConCosto = vendido > 0 ? ingresos * (vendidoConCosto / vendido) : 0;
        const costoVendido = vendidoConCosto * costoUnitario;
        const utilidad = ingresosConCosto - costoVendido;
        const restante = Math.max(0, comprado - vendido);

        let estado = 'ganancia';
        if (comprado <= 0) estado = 'sin-datos';
        else if (vendido <= 0) estado = 'sin-ventas';
        else if (utilidad > 0.005) estado = 'ganancia';
        else if (utilidad < -0.005) estado = 'perdida';
        else estado = 'equilibrio';

        console.log(`📦 [${producto?.nombre}] id=${id}`, {
          comprado: `${comprado} ${unidadCorta(producto?.unidad_medida)}`,
          invertido: `C$${invertido.toFixed(2)}`,
          ventasEncontradas: ventasProducto.length,
          vendido: `${vendido} ${unidadCorta(producto?.unidad_medida)}`,
          ingresos: `C$${ingresos.toFixed(2)}`,
          utilidad: `C$${utilidad.toFixed(2)}`,
          estado
        });

        return {
          id,
          nombre: producto?.nombre || 'Producto eliminado',
          unidad: unidadCorta(producto?.unidad_medida),
          invertido,
          comprado,
          costoUnitario,
          vendido,
          ingresos,
          utilidad,
          restante,
          valorRestante: restante * costoUnitario,
          recuperado: invertido > 0 ? (ingresos / invertido) * 100 : 0,
          vendeMasDeLoComprado: comprado > 0 && vendido > comprado,
          estado,
          inversiones: compras
        };
      });

      resultado.sort((a, b) =>
        PRIORIDAD[a.estado] - PRIORIDAD[b.estado] || b.invertido - a.invertido
      );

      console.log('✅ [cargar] Tarjetas calculadas:', resultado.length);
      setTarjetas(resultado);
    } catch (err) {
      console.error('❌ Error calculando inversión vs ventas:', err.message);
      setError('No se pudo calcular el resultado: ' + (err.message || 'error de conexión'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🔄 [useEffect] Disparando cargar() por version:', version);
    cargar();
  }, [cargar, version]);

  useEffect(() => {
    const programar = () => {
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(cargar, 800);
    };

    const canal = supabase
      .channel(`resultado_inversion_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, programar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facturados' }, programar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inversiones' }, programar)
      .subscribe();

    return () => {
      clearTimeout(temporizador.current);
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  useEffect(() => {
    const cerrar = () => setMenuAbierto(null);
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, []);

  const totalInvertido = tarjetas.reduce((s, t) => s + t.invertido, 0);
  const totalIngresos = tarjetas.reduce((s, t) => s + t.ingresos, 0);
  const utilidadTotal = tarjetas.reduce((s, t) => s + t.utilidad, 0);
  const conPerdida = tarjetas.filter(t => t.estado === 'perdida').length;
  const conGanancia = tarjetas.filter(t => t.estado === 'ganancia').length;

  const abrirEdicion = (tarjeta) => {
    setEditando({
      productoId: tarjeta.id,
      nombre: tarjeta.nombre,
      unidad: tarjeta.unidad,
      inversiones: tarjeta.inversiones.map(inv => ({
        id: inv.id,
        fecha: inv.fecha,
        cantidad: parseFloat(inv[COLUMNA_CANTIDAD]) || 0,
        monto: parseFloat(inv[COLUMNA_MONTO]) || 0
      }))
    });
    setMenuAbierto(null);
  };

  const actualizarInversion = (id, campo, valor) => {
    setEditando(prev => ({
      ...prev,
      inversiones: prev.inversiones.map(inv =>
        inv.id === id ? { ...inv, [campo]: valor } : inv
      )
    }));
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      const promesas = editando.inversiones.map(inv =>
        supabase
          .from('inversiones')
          .update({
            [COLUMNA_CANTIDAD]: inv.cantidad,
            [COLUMNA_MONTO]: inv.monto
          })
          .eq('id', inv.id)
      );

      const resultados = await Promise.all(promesas);
      const errorEncontrado = resultados.find(r => r.error);
      if (errorEncontrado) throw errorEncontrado.error;

      setEditando(null);
      await cargar();
    } catch (err) {
      console.error('Error al guardar:', err);
      alert('No se pudo guardar: ' + (err.message || 'error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  const abrirEliminacion = (inversion, nombreProducto) => {
    setEliminando({
      id: inversion.id,
      nombre: nombreProducto,
      monto: parseFloat(inversion[COLUMNA_MONTO]) || 0,
      cantidad: parseFloat(inversion[COLUMNA_CANTIDAD]) || 0
    });
    setMenuAbierto(null);
  };

  const confirmarEliminacion = async () => {
    if (!eliminando) return;
    setBorrando(true);
    try {
      const { error } = await supabase
        .from('inversiones')
        .delete()
        .eq('id', eliminando.id);

      if (error) throw error;

      setEliminando(null);
      await cargar();
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('No se pudo eliminar: ' + (err.message || 'error desconocido'));
    } finally {
      setBorrando(false);
    }
  };

  console.log('🎨 [RENDER] loading:', loading, '| error:', error, '| tarjetas:', tarjetas.length);

  return (
    <section className="resultado-productos">
      <div className="resultado-header">
        <h3>
          <i className="fas fa-scale-balanced"></i> Inversión vs ventas por producto
        </h3>
        <span className="resultado-subtitulo">
          Acumulado desde la primera compra de cada producto
        </span>
        <button
          className="btn-icono resultado-actualizar"
          onClick={cargar}
          title="Actualizar"
          aria-label="Actualizar"
        >
          <i className="fas fa-sync"></i>
        </button>
      </div>

      {loading ? (
        <div className="resultado-estado">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Calculando...</p>
        </div>
      ) : error ? (
        <div className="resultado-estado resultado-error">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
        </div>
      ) : tarjetas.length === 0 ? (
        <div className="resultado-estado">
          <i className="fas fa-box-open"></i>
          <p>Aún no hay compras con producto y cantidad</p>
          <span>
            Al registrar una inversión, elige el producto y la cantidad comprada.
          </span>
        </div>
      ) : (
        <>
          <div className="resultado-resumen">
            <div className="resumen-mini">
              <span>Invertido</span>
              <strong>{dinero(totalInvertido)}</strong>
            </div>
            <div className="resumen-mini">
              <span>Ingresos por ventas</span>
              <strong>{dinero(totalIngresos)}</strong>
            </div>
            <div className={`resumen-mini ${utilidadTotal >= 0 ? 'mini-ganancia' : 'mini-perdida'}`}>
              <span>{utilidadTotal >= 0 ? 'Ganancia total' : 'Pérdida total'}</span>
              <strong>
                {utilidadTotal >= 0 ? '+' : '−'}{dinero(Math.abs(utilidadTotal))}
              </strong>
            </div>
            <div className="resumen-mini">
              <span>Productos</span>
              <strong>
                <span className="txt-verde">{conGanancia} ganan</span>
                {' · '}
                <span className="txt-rojo">{conPerdida} pierden</span>
              </strong>
            </div>
          </div>

          <div className="resultado-grid">
            {tarjetas.map(t => {
              const etiqueta = ETIQUETAS[t.estado];
              const mostrarResultado = t.estado === 'ganancia' || t.estado === 'perdida' || t.estado === 'equilibrio';

              return (
                <article key={t.id} className={`tarjeta-resultado estado-${t.estado}`}>
                  <header className="tarjeta-resultado-top">
                    <h4>{t.nombre}</h4>
                    <div className="tarjeta-acciones">
                      <span className={`badge-estado badge-${t.estado}`}>
                        <i className={`fas ${etiqueta.icono}`}></i> {etiqueta.texto}
                      </span>
                      <div className="menu-contenedor" onClick={e => e.stopPropagation()}>
                        <button
                          className="btn-menu"
                          onClick={() => setMenuAbierto(menuAbierto === t.id ? null : t.id)}
                          title="Acciones"
                          aria-label="Acciones"
                        >
                          <i className="fas fa-ellipsis-vertical"></i>
                        </button>
                        {menuAbierto === t.id && (
                          <div className="menu-desplegable">
                            <button
                              className="btn-icono btn-editar"
                              onClick={() => abrirEdicion(t)}
                              title="Editar"
                              aria-label="Editar"
                            >
                              <i className="fas fa-pen"></i>
                            </button>
                            {t.inversiones.length === 1 ? (
                              <button
                                className="btn-icono btn-eliminar"
                                onClick={() => abrirEliminacion(t.inversiones[0], t.nombre)}
                                title="Eliminar"
                                aria-label="Eliminar"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            ) : (
                              <div className="menu-submenu">
                                {t.inversiones.map(inv => (
                                  <button
                                    key={inv.id}
                                    className="btn-icono btn-eliminar"
                                    onClick={() => abrirEliminacion(inv, t.nombre)}
                                    title={`Eliminar ${dinero(parseFloat(inv[COLUMNA_MONTO]) || 0)} · ${numero(parseFloat(inv[COLUMNA_CANTIDAD]) || 0)} ${t.unidad}`}
                                    aria-label="Eliminar compra"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </header>

                  {mostrarResultado && (
                    <div className="tarjeta-resultado-monto">
                      <strong>
                        {t.utilidad > 0.005 ? '+' : t.utilidad < -0.005 ? '−' : ''}
                        {dinero(Math.abs(t.utilidad))}
                      </strong>
                      <span>de lo ya vendido</span>
                    </div>
                  )}

                  {t.comprado > 0 && (
                    <div className="barra-recuperado">
                      <div className="barra-recuperado-texto">
                        <span>Recuperado de lo invertido</span>
                        <strong>{numero(t.recuperado)}%</strong>
                      </div>
                      <div className="barra-recuperado-fondo">
                        <div
                          className="barra-recuperado-relleno"
                          style={{ width: `${Math.min(100, t.recuperado)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <dl className="tarjeta-resultado-datos">
                    <div>
                      <dt>Invertido</dt>
                      <dd>{dinero(t.invertido)}</dd>
                    </div>
                    <div>
                      <dt>Comprado</dt>
                      <dd>
                        {t.comprado > 0 ? `${numero(t.comprado)} ${t.unidad}` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Costo por {t.unidad || 'unidad'}</dt>
                      <dd>{t.comprado > 0 ? dinero(t.costoUnitario) : '—'}</dd>
                    </div>
                    <div>
                      <dt>Vendido</dt>
                      <dd>{numero(t.vendido)} {t.unidad}</dd>
                    </div>
                    <div>
                      <dt>Ingresos</dt>
                      <dd>{dinero(t.ingresos)}</dd>
                    </div>
                    <div>
                      <dt>Queda por vender</dt>
                      <dd>
                        {t.comprado > 0
                          ? `${numero(t.restante)} ${t.unidad} (${dinero(t.valorRestante)})`
                          : '—'}
                      </dd>
                    </div>
                  </dl>

                  {t.estado === 'sin-datos' && (
                    <p className="tarjeta-aviso">
                      <i className="fas fa-info-circle"></i> Edita la compra y agrega la cantidad comprada.
                    </p>
                  )}

                  {t.vendeMasDeLoComprado && (
                    <p className="tarjeta-aviso">
                      <i className="fas fa-exclamation-triangle"></i> Has vendido más de lo registrado en compras.
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <p className="resultado-nota">
            La ganancia se calcula sobre lo ya vendido: ingresos − (cantidad vendida × costo por unidad).
            Incluye ventas activas (tabla "ventas") y ventas ya arquedas (tabla "facturados").
          </p>
        </>
      )}

      {/* ===== MODAL DE EDICIÓN ===== */}
      {editando && (
        <div className="modal-overlay" onClick={() => !guardando && setEditando(null)}>
          <div className="modal-contenido" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>
                <i className="fas fa-pen"></i> Editar inversión
              </h3>
              <button
                className="btn-icono btn-neutral"
                onClick={() => setEditando(null)}
                disabled={guardando}
                title="Cerrar"
                aria-label="Cerrar"
              >
                <i className="fas fa-times"></i>
              </button>
            </header>

            <p className="modal-subtitulo">
              Producto: <strong>{editando.nombre}</strong>
            </p>

            <div className="modal-lista-inversiones">
              {editando.inversiones.map((inv, idx) => (
                <div key={inv.id} className="modal-inversion-item">
                  <div className="modal-inversion-header">
                    <span>Compra #{idx + 1}</span>
                    <span className="modal-inversion-fecha">
                      {new Date(inv.fecha).toLocaleDateString('es-NI')}
                    </span>
                  </div>
                  <div className="modal-campos">
                    <label>
                      <span>Cantidad ({editando.unidad || 'unidad'})</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inv.cantidad}
                        onChange={e =>
                          actualizarInversion(inv.id, 'cantidad', parseFloat(e.target.value) || 0)
                        }
                        disabled={guardando}
                      />
                    </label>
                    <label>
                      <span>Monto (C$)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inv.monto}
                        onChange={e =>
                          actualizarInversion(inv.id, 'monto', parseFloat(e.target.value) || 0)
                        }
                        disabled={guardando}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <footer className="modal-footer">
              <button
                className="btn-icono btn-neutral"
                onClick={() => setEditando(null)}
                disabled={guardando}
                title="Cancelar"
                aria-label="Cancelar"
              >
                <i className="fas fa-times"></i>
              </button>
              <button
                className="btn-icono btn-guardar"
                onClick={guardarEdicion}
                disabled={guardando}
                title="Guardar cambios"
                aria-label="Guardar cambios"
              >
                {guardando ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-save"></i>
                )}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ===== MODAL DE ELIMINACIÓN ===== */}
      {eliminando && (
        <div className="modal-overlay" onClick={() => !borrando && setEliminando(null)}>
          <div className="modal-contenido modal-confirmar" onClick={e => e.stopPropagation()}>
            <header className="modal-header modal-header-peligro">
              <h3>
                <i className="fas fa-exclamation-triangle"></i> Confirmar eliminación
              </h3>
              <button
                className="btn-icono btn-neutral"
                onClick={() => setEliminando(null)}
                disabled={borrando}
                title="Cerrar"
                aria-label="Cerrar"
              >
                <i className="fas fa-times"></i>
              </button>
            </header>

            <div className="modal-cuerpo">
              <p>¿Estás seguro de que deseas eliminar esta compra?</p>
              <div className="modal-detalle-eliminar">
                <div>
                  <span>Producto:</span>
                  <strong>{eliminando.nombre}</strong>
                </div>
                <div>
                  <span>Cantidad:</span>
                  <strong>{numero(eliminando.cantidad)}</strong>
                </div>
                <div>
                  <span>Monto:</span>
                  <strong>{dinero(eliminando.monto)}</strong>
                </div>
              </div>
              <p className="modal-advertencia">
                <i className="fas fa-info-circle"></i> Esta acción no se puede deshacer.
              </p>
            </div>

            <footer className="modal-footer">
              <button
                className="btn-icono btn-neutral"
                onClick={() => setEliminando(null)}
                disabled={borrando}
                title="Cancelar"
                aria-label="Cancelar"
              >
                <i className="fas fa-times"></i>
              </button>
              <button
                className="btn-icono btn-eliminar"
                onClick={confirmarEliminacion}
                disabled={borrando}
                title="Eliminar"
                aria-label="Eliminar"
              >
                {borrando ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-trash"></i>
                )}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
};

export default TarjetasResultadoProductos;