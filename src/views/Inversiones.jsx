// src/views/Inversiones.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import * as XLSX from 'xlsx';
import './Inversiones.css';
import Encabezado from '../components/Encabezado';
import PDFInversiones from '../components/PDFInversiones';

const Inversiones = () => {
  const navigate = useNavigate();
  
  const [inversiones, setInversiones] = useState([]);
  const [inversionesFiltradas, setInversionesFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conectado, setConectado] = useState(navigator.onLine);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null);
  
  const [filtroFecha, setFiltroFecha] = useState(() => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroBanco, setFiltroBanco] = useState('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  
  const [resumen, setResumen] = useState({
    totalInversiones: 0,
    totalTransferencia: 0,
    totalEfectivo: 0,
    cantidadRegistros: 0
  });

  const [formData, setFormData] = useState({
    nombre: '',
    monto: '',
    tipo_monto: 'transferencia',
    banco: '',
    fecha: new Date().toISOString().slice(0, 16)
  });

  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [operacionesPendientes, setOperacionesPendientes] = useState(0);

  // ===== CARGAR DATOS =====
  const cargarInversiones = async () => {
    try {
      setLoading(true);
      setError(null);

      if (navigator.onLine) {
        const { data, error: err } = await supabase
          .from('inversiones')
          .select('*')
          .order('fecha', { ascending: false });

        if (err) throw err;

        if (data) {
          setInversiones(data);
          localStorage.setItem('inversiones_cache', JSON.stringify(data));
        }
        setConectado(true);
      } else {
        const cache = localStorage.getItem('inversiones_cache');
        if (cache) {
          const data = JSON.parse(cache);
          setInversiones(data);
        } else {
          setInversiones([]);
        }
        setConectado(false);
      }
    } catch (err) {
      console.error('Error cargando inversiones:', err);
      setError(err.message);
      
      const cache = localStorage.getItem('inversiones_cache');
      if (cache) {
        const data = JSON.parse(cache);
        setInversiones(data);
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== CONTAR OPERACIONES PENDIENTES =====
  useEffect(() => {
    const contar = () => {
      const ops = obtenerOperacionesPendientes();
      setOperacionesPendientes(ops.length);
    };
    contar();
    const interval = setInterval(contar, 5000);
    return () => clearInterval(interval);
  }, []);

  // ===== DETECTAR CAMBIOS DE CONEXIÓN =====
  useEffect(() => {
    const handleOnline = () => {
      setConectado(true);
      cargarInversiones();
    };
    
    const handleOffline = () => {
      setConectado(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ===== CARGA INICIAL =====
  useEffect(() => {
    cargarInversiones();
  }, []);

  // ===== APLICAR FILTROS =====
  useEffect(() => {
    aplicarFiltros();
  }, [inversiones, filtroFecha, filtroTipo, filtroBanco, filtroBusqueda]);

  const aplicarFiltros = () => {
    let filtradas = [...inversiones];
    
    if (filtroFecha) {
      const [year, month] = filtroFecha.split('-');
      const inicioMes = new Date(year, month - 1, 1);
      const finMes = new Date(year, month, 0, 23, 59, 59);
      
      filtradas = filtradas.filter(f => {
        if (!f.fecha) return false;
        const fecha = new Date(f.fecha);
        return fecha >= inicioMes && fecha <= finMes;
      });
    }
    
    if (filtroTipo !== 'todos') {
      filtradas = filtradas.filter(f => f.tipo_monto === filtroTipo);
    }
    
    if (filtroBanco !== 'todos') {
      filtradas = filtradas.filter(f => f.banco === filtroBanco);
    }
    
    if (filtroBusqueda.trim() !== '') {
      const termino = filtroBusqueda.toLowerCase();
      filtradas = filtradas.filter(f => {
        return (
          (f.nombre && f.nombre.toLowerCase().includes(termino)) ||
          (f.banco && f.banco.toLowerCase().includes(termino)) ||
          (f.id && f.id.toString().includes(termino))
        );
      });
    }
    
    setInversionesFiltradas(filtradas);
    calcularResumen(filtradas);
  };

  const formatFechaNicaragua = (fechaISO) => {
    if (!fechaISO) return 'Fecha no disponible';
    try {
      const fechaUTC = new Date(fechaISO);
      const fechaNic = new Date(fechaUTC.getTime() - (6 * 60 * 60 * 1000));
      
      const d = fechaNic.getDate().toString().padStart(2, '0');
      const m = (fechaNic.getMonth() + 1).toString().padStart(2, '0');
      const y = fechaNic.getFullYear();
      
      let h = fechaNic.getHours();
      const min = fechaNic.getMinutes().toString().padStart(2, '0');
      const ampm = h >= 12 ? 'p.m.' : 'a.m.';
      
      h = h % 12;
      h = h ? h.toString().padStart(2, '0') : '12';
      
      return `${d}/${m}/${y} ${h}:${min} ${ampm}`;
    } catch (e) {
      return fechaISO;
    }
  };

  const calcularResumen = (data) => {
    let totalInversiones = 0;
    let totalTransferencia = 0;
    let totalEfectivo = 0;

    data.forEach(f => {
      const monto = parseFloat(f.monto || 0);
      totalInversiones += monto;
      
      if (f.tipo_monto === 'transferencia') {
        totalTransferencia += monto;
      } else if (f.tipo_monto === 'efectivo') {
        totalEfectivo += monto;
      }
    });

    setResumen({
      totalInversiones,
      totalTransferencia,
      totalEfectivo,
      cantidadRegistros: data.length
    });
  };

  const generarMesesDisponibles = () => {
    const meses = [];
    const ahora = new Date();
    
    for (let i = 0; i < 12; i++) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const valor = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const nombre = fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
      meses.push({ valor, nombre });
    }
    
    return meses;
  };

  // ===== FUNCIONES DE OFFLINE =====
  const obtenerOperacionesPendientes = () => {
    try {
      const data = localStorage.getItem('operaciones_pendientes_inversiones');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  };

  const agregarOperacion = (operacion) => {
    try {
      const operaciones = obtenerOperacionesPendientes();
      const nuevaOperacion = {
        ...operacion,
        id_local: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };
      operaciones.push(nuevaOperacion);
      localStorage.setItem('operaciones_pendientes_inversiones', JSON.stringify(operaciones));
      setOperacionesPendientes(operaciones.length);
      return nuevaOperacion;
    } catch (error) {
      console.error('Error guardando operación:', error);
      return null;
    }
  };

  const sincronizarOperaciones = async () => {
    const operaciones = obtenerOperacionesPendientes();
    
    if (operaciones.length === 0) {
      return { success: true, sincronizadas: 0 };
    }

    let sincronizadas = 0;
    let errores = [];

    for (const op of operaciones) {
      try {
        let result;
        
        switch (op.tipo) {
          case 'INSERT':
            result = await supabase
              .from('inversiones')
              .insert([op.datos])
              .select();
            break;
            
          case 'UPDATE':
            result = await supabase
              .from('inversiones')
              .update(op.datos)
              .eq('id', op.id_registro)
              .select();
            break;
            
          case 'DELETE':
            result = await supabase
              .from('inversiones')
              .delete()
              .eq('id', op.id_registro);
            break;
            
          default:
            continue;
        }

        if (result.error) {
          errores.push({ operacion: op, error: result.error });
          continue;
        }

        sincronizadas++;
        
      } catch (error) {
        errores.push({ operacion: op, error: error.message });
      }
    }

    const pendientes = operaciones.slice(sincronizadas);
    localStorage.setItem('operaciones_pendientes_inversiones', JSON.stringify(pendientes));
    setOperacionesPendientes(pendientes.length);

    return {
      success: errores.length === 0,
      sincronizadas,
      errores,
      pendientes: pendientes.length
    };
  };

  // ===== GUARDAR (CREAR/ACTUALIZAR) =====
  const handleGuardar = async () => {
    try {
      setError(null);
      
      if (!formData.nombre.trim()) {
        setError('El nombre es obligatorio');
        return;
      }
      if (!formData.monto || parseFloat(formData.monto) <= 0) {
        setError('El monto debe ser mayor a 0');
        return;
      }
      if (formData.tipo_monto === 'transferencia' && !formData.banco) {
        setError('Debes seleccionar un banco para transferencias');
        return;
      }

      const dataToSave = {
        nombre: formData.nombre.trim(),
        monto: parseFloat(formData.monto),
        tipo_monto: formData.tipo_monto,
        banco: formData.tipo_monto === 'transferencia' ? formData.banco : null,
        fecha: new Date(formData.fecha).toISOString()
      };

      if (editando) {
        if (typeof editando === 'string' && editando.startsWith('local_')) {
          setInversiones(prev => {
            const updated = prev.map(item => 
              item.id === editando ? { ...item, ...dataToSave } : item
            );
            localStorage.setItem('inversiones_cache', JSON.stringify(updated));
            return updated;
          });
          cerrarModal();
          setExito('📝 Actualizado localmente');
          setTimeout(() => setExito(null), 3000);
          return;
        }

        if (conectado) {
          const { data, error: updateError } = await supabase
            .from('inversiones')
            .update(dataToSave)
            .eq('id', editando)
            .select();

          if (updateError) throw updateError;

          if (data && data.length > 0) {
            setInversiones(prev => {
              const updated = prev.map(item => 
                item.id === editando ? data[0] : item
              );
              localStorage.setItem('inversiones_cache', JSON.stringify(updated));
              return updated;
            });
            cerrarModal();
            setExito('✅ Inversión actualizada');
            setTimeout(() => setExito(null), 3000);
            return;
          }
          return;
        }

        agregarOperacion({
          tipo: 'UPDATE',
          tabla: 'inversiones',
          datos: dataToSave,
          id_registro: editando
        });
        
        setInversiones(prev => {
          const updated = prev.map(item => 
            item.id === editando ? { ...item, ...dataToSave, _local: true } : item
          );
          localStorage.setItem('inversiones_cache', JSON.stringify(updated));
          return updated;
        });
        cerrarModal();
        setExito('📝 Actualizado localmente');
        setTimeout(() => setExito(null), 3000);

      } else {
        if (conectado) {
          const { data: existente } = await supabase
            .from('inversiones')
            .select('id')
            .eq('nombre', dataToSave.nombre)
            .maybeSingle();

          if (existente) {
            setError(`La inversión "${dataToSave.nombre}" ya existe`);
            return;
          }
        }

        if (conectado) {
          const { data, error: insertError } = await supabase
            .from('inversiones')
            .insert([dataToSave])
            .select();

          if (insertError) throw insertError;

          if (data && data.length > 0) {
            setInversiones(prev => {
              const updated = [data[0], ...prev];
              localStorage.setItem('inversiones_cache', JSON.stringify(updated));
              return updated;
            });
            cerrarModal();
            setExito('✅ Inversión creada');
            setTimeout(() => setExito(null), 3000);
            return;
          }
          return;
        }

        const idLocal = `local_${Date.now()}`;
        
        agregarOperacion({
          tipo: 'INSERT',
          tabla: 'inversiones',
          datos: dataToSave
        });

        const nuevoRegistro = { 
          ...dataToSave, 
          id: idLocal, 
          _local: true 
        };

        setInversiones(prev => {
          const updated = [nuevoRegistro, ...prev];
          localStorage.setItem('inversiones_cache', JSON.stringify(updated));
          return updated;
        });

        cerrarModal();
        setExito('📝 Guardado localmente');
        setTimeout(() => setExito(null), 3000);
      }

    } catch (error) {
      console.error('Error:', error);
      setError(`Error: ${error.message}`);
    }
  };

  // ===== ELIMINAR =====
  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta inversión?')) return;

    try {
      setError(null);

      if (typeof id === 'string' && id.startsWith('local_')) {
        setInversiones(prev => {
          const updated = prev.filter(item => item.id !== id);
          localStorage.setItem('inversiones_cache', JSON.stringify(updated));
          return updated;
        });
        setExito('🗑️ Eliminado localmente');
        setTimeout(() => setExito(null), 3000);
        return;
      }

      if (conectado) {
        const { error: deleteError } = await supabase
          .from('inversiones')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        setInversiones(prev => {
          const updated = prev.filter(item => item.id !== id);
          localStorage.setItem('inversiones_cache', JSON.stringify(updated));
          return updated;
        });
        setExito('🗑️ Inversión eliminada');
        setTimeout(() => setExito(null), 3000);
        return;
      }

      agregarOperacion({
        tipo: 'DELETE',
        tabla: 'inversiones',
        id_registro: id
      });
      
      setInversiones(prev => {
        const updated = prev.filter(item => item.id !== id);
        localStorage.setItem('inversiones_cache', JSON.stringify(updated));
        return updated;
      });
      setExito('📝 Eliminado localmente');
      setTimeout(() => setExito(null), 3000);

    } catch (error) {
      console.error('Error:', error);
      setError(`Error: ${error.message}`);
    }
  };

  // ===== SINCRONIZAR MANUAL =====
  const sincronizarManual = async () => {
    if (!conectado) {
      setError('Sin conexión a internet');
      return;
    }

    try {
      setExito('🔄 Sincronizando...');
      const resultado = await sincronizarOperaciones();
      
      if (resultado.success) {
        await cargarInversiones();
        setExito(resultado.sincronizadas > 0 ? 
          `✅ ${resultado.sincronizadas} operaciones sincronizadas` : 
          '✅ Todo sincronizado');
      } else {
        setExito(`⚠️ ${resultado.sincronizadas} sincronizadas, ${resultado.errores.length} errores`);
      }
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      setError('Error al sincronizar: ' + err.message);
    }
  };

  const abrirModal = (inversion = null) => {
    setError(null);
    if (inversion) {
      setEditando(inversion.id);
      setFormData({
        nombre: inversion.nombre || '',
        monto: inversion.monto ? inversion.monto.toString() : '',
        tipo_monto: inversion.tipo_monto || 'transferencia',
        banco: inversion.banco || '',
        fecha: inversion.fecha ? new Date(inversion.fecha).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
      });
    } else {
      setEditando(null);
      setFormData({
        nombre: '',
        monto: '',
        tipo_monto: 'transferencia',
        banco: '',
        fecha: new Date().toISOString().slice(0, 16)
      });
    }
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditando(null);
    setError(null);
  };

  // ===== EXPORTAR EXCEL =====
  const exportarExcel = () => {
    try {
      setExportando(true);

      const datosExcel = inversionesFiltradas.map(f => ({
        'Fecha': formatFechaNicaragua(f.fecha).split(' ')[0],
        'Nombre': f.nombre,
        'Tipo': f.tipo_monto,
        'Banco': f.banco || 'N/A',
        'Monto': `C$${parseFloat(f.monto || 0).toFixed(2)}`
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(datosExcel);

      const colWidths = [
        { wch: 15 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Inversiones');

      const resumenData = [{
        'Concepto': 'Total Inversiones',
        'Monto': `C$${resumen.totalInversiones.toFixed(2)}`
      }, {
        'Concepto': 'Transferencia',
        'Monto': `C$${resumen.totalTransferencia.toFixed(2)}`
      }, {
        'Concepto': 'Efectivo',
        'Monto': `C$${resumen.totalEfectivo.toFixed(2)}`
      }, {
        'Concepto': 'Registros Mostrados',
        'Monto': resumen.cantidadRegistros
      }];

      const wsResumen = XLSX.utils.json_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      const [year, month] = filtroFecha.split('-');
      const nombreMes = new Date(year, month - 1).toLocaleDateString('es-MX', { month: 'long' });
      const nombreArchivo = `inversiones_${nombreMes}_${year}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);

      setTimeout(() => setExportando(false), 1000);

    } catch (error) {
      console.error('Error:', error);
      setError('Error al exportar a Excel');
      setExportando(false);
    }
  };

  // ===== EXPORTAR PDF (CORREGIDO) =====
  const exportarPDF = async () => {
    if (inversionesFiltradas.length === 0) {
      setError('No hay inversiones para exportar');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setExportando(true);
      
      const [year, month] = filtroFecha.split('-');
      const nombreMes = new Date(year, month - 1).toLocaleDateString('es-MX', { month: 'long' });
      
      // Llamar a PDFInversiones que ya guarda el archivo automáticamente
      await PDFInversiones(
        inversionesFiltradas,
        `${nombreMes} ${year}`,
        resumen.totalInversiones,
        resumen.totalTransferencia,
        resumen.totalEfectivo
      );
      
      setExito('📄 PDF generado exitosamente');
      setTimeout(() => setExito(null), 3000);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al exportar a PDF: ' + error.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setExportando(false);
    }
  };

  const mesesDisponibles = generarMesesDisponibles();

  return (
    <div className="inversiones-container">
      <Encabezado />
      
      <div className="inversiones-content">
        {/* HEADER */}
        <div className="inversiones-header">
          <div className="inversiones-titulo-container">
            <h1 className="inversiones-titulo">💰 Inversiones</h1>
            <p className="inversiones-subtitulo">Gestión de inversiones y montos</p>
          </div>
          
          <div className="inversiones-botones-header">
            <span className={`status-indicator ${conectado ? 'online' : 'offline'}`}>
              <i className={`fas ${conectado ? 'fa-wifi' : 'fa-wifi-slash'}`}></i>
              {conectado ? ' En línea' : ' Sin conexión'}
            </span>
            {operacionesPendientes > 0 && (
              <span className="pendientes-indicator">
                <i className="fas fa-clock"></i> {operacionesPendientes} pendientes
              </span>
            )}
            <button 
              className="btn-sincronizar" 
              onClick={sincronizarManual} 
              disabled={!conectado}
            >
              <i className="fas fa-sync"></i> Sincronizar
            </button>
            <button onClick={() => abrirModal()} className="btn-agregar">
              <i className="fas fa-plus-circle"></i>
              Nueva Inversión
            </button>
          </div>
        </div>

        {/* ERRORES Y ÉXITOS */}
        {error && (
          <div className="inversiones-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {exito && (
          <div className="inversiones-exito">
            <i className="fas fa-check-circle"></i>
            <span>{exito}</span>
            <button onClick={() => setExito(null)} className="exito-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* FILTROS */}
        <div className="filtros-adicionales">
          <div className="filtro-grupo">
            <label className="filtro-label">Mes:</label>
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="filtro-select"
              disabled={loading}
            >
              {mesesDisponibles.map(({ valor, nombre }) => (
                <option key={valor} value={valor}>
                  {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filtro-grupo">
            <label className="filtro-label">Tipo:</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="filtro-select"
            >
              <option value="todos">Todos</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>

          <div className="filtro-grupo">
            <label className="filtro-label">Banco:</label>
            <select
              value={filtroBanco}
              onChange={(e) => setFiltroBanco(e.target.value)}
              className="filtro-select"
            >
              <option value="todos">Todos</option>
              <option value="ficohsa">Ficohsa</option>
              <option value="lafise">Lafise</option>
              <option value="banpro">Banpro</option>
              <option value="avanz">Avanz</option>
              <option value="bac">BAC</option>
              <option value="bdf">BDF</option>
            </select>
          </div>

          <div className="filtro-grupo buscador">
            <label className="filtro-label">Buscar:</label>
            <input
              type="text"
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              placeholder="Nombre, banco..."
              className="filtro-input"
            />
            {filtroBusqueda && (
              <button className="filtro-limpiar" onClick={() => setFiltroBusqueda('')}>
                ✕
              </button>
            )}
          </div>

          <div className="filtro-info">
            Mostrando {inversionesFiltradas.length} de {inversiones.length} registros
          </div>
        </div>

        {/* RESUMEN - 3 TARJETAS */}
        <div className="resumen-grid-inversiones">
          <div className="resumen-card total-card">
            <div className="resumen-card-content">
              <span className="resumen-card-label">TOTAL INVERTIDO</span>
              <strong className="resumen-card-value">
                C${resumen.totalInversiones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
              <span className="resumen-card-sub">{resumen.cantidadRegistros} registros</span>
            </div>
            <div className="resumen-card-icon">💰</div>
          </div>

          <div className="resumen-card transferencia-card">
            <div className="resumen-card-content">
              <span className="resumen-card-label">TRANSFERENCIA</span>
              <strong className="resumen-card-value">
                C${resumen.totalTransferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="resumen-card-icon">🏦</div>
          </div>

          <div className="resumen-card efectivo-card">
            <div className="resumen-card-content">
              <span className="resumen-card-label">EFECTIVO</span>
              <strong className="resumen-card-value">
                C${resumen.totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="resumen-card-icon">💵</div>
          </div>
        </div>

        {/* BOTONES EXPORTAR */}
        <div className="export-buttons">
          <button
            onClick={exportarExcel}
            disabled={loading || inversionesFiltradas.length === 0 || exportando}
            className="btn-exportar excel"
          >
            {exportando ? (
              <>
                <span className="spinner-mini"></span>
                Exportando...
              </>
            ) : (
              <>
                <i className="fas fa-file-excel"></i>
                Exportar Excel
              </>
            )}
          </button>
          <button
            onClick={exportarPDF}
            disabled={loading || inversionesFiltradas.length === 0 || exportando}
            className="btn-exportar pdf"
          >
            {exportando ? (
              <>
                <span className="spinner-mini"></span>
                Exportando...
              </>
            ) : (
              <>
                <i className="fas fa-file-pdf"></i>
                Exportar PDF
              </>
            )}
          </button>
        </div>

        {/* TABLA */}
        <div className="tabla-inversiones-container">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Cargando inversiones...</p>
            </div>
          ) : inversionesFiltradas.length === 0 ? (
            <div className="sin-datos">
              <i className="fas fa-inbox"></i>
              <p>No hay inversiones para los filtros seleccionados</p>
            </div>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla-inversiones">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Banco</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inversionesFiltradas.map((inversion) => (
                    <tr key={inversion.id} className={inversion._local ? 'fila-local' : ''}>
                      <td className="col-fecha">{formatFechaNicaragua(inversion.fecha)}</td>
                      <td className="col-nombre">
                        {inversion.nombre}
                        {inversion._local && (
                          <span className="badge-local">📝 Local</span>
                        )}
                      </td>
                      <td className="col-tipo">
                        <span className={`badge-tipo ${inversion.tipo_monto}`}>
                          {inversion.tipo_monto}
                        </span>
                      </td>
                      <td className="col-banco">
                        {inversion.banco ? (
                          <span className={`badge-banco ${inversion.banco}`}>
                            {inversion.banco}
                          </span>
                        ) : (
                          <span className="badge-banco sin-banco">N/A</span>
                        )}
                      </td>
                      <td className="col-monto">C${parseFloat(inversion.monto || 0).toFixed(2)}</td>
                      <td className="col-acciones">
                        <button
                          onClick={() => abrirModal(inversion)}
                          className="btn-accion editar"
                          title="Editar"
                        >
                          <i className="fas fa-edit"></i>
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleEliminar(inversion.id)}
                          className="btn-accion eliminar"
                          title="Eliminar"
                        >
                          <i className="fas fa-trash-alt"></i>
                          <span>Eliminar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-titulo">
                {editando ? 'Editar Inversión' : 'Nueva Inversión'}
              </h2>
              <button className="modal-cerrar" onClick={cerrarModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grupo">
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="form-input"
                  placeholder="Ej: Compra de equipo, Inversión en proyecto..."
                />
              </div>

              <div className="form-grupo">
                <label className="form-label">Monto (C$) *</label>
                <input
                  type="number"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="form-input"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div className="form-grupo">
                <label className="form-label">Tipo de Monto *</label>
                <select
                  value={formData.tipo_monto}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      tipo_monto: e.target.value,
                      banco: e.target.value === 'transferencia' ? formData.banco : ''
                    });
                  }}
                  className="form-select"
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>

              {formData.tipo_monto === 'transferencia' && (
                <div className="form-grupo">
                  <label className="form-label">Banco *</label>
                  <select
                    value={formData.banco}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Selecciona un banco</option>
                    <option value="ficohsa">Ficohsa</option>
                    <option value="lafise">Lafise</option>
                    <option value="banpro">Banpro</option>
                    <option value="avanz">Avanz</option>
                    <option value="bac">BAC</option>
                    <option value="bdf">BDF</option>
                  </select>
                </div>
              )}

              <div className="form-grupo">
                <label className="form-label">Fecha *</label>
                <input
                  type="datetime-local"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-modal-cancelar" onClick={cerrarModal}>
                Cancelar
              </button>
              <button className="btn-modal-guardar" onClick={handleGuardar}>
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NAVEGACIÓN INFERIOR ===== */}
      <div className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/')}>
          <i className="fas fa-home"></i>
          <span>Inicio</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/productos')}>
          <i className="fas fa-box"></i>
          <span>Productos</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/inventario')}>
          <i className="fas fa-warehouse"></i>
          <span>Inventario</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/ventas')}>
          <i className="fas fa-cash-register"></i>
          <span>Ventas</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/mas')}>
          <i className="fas fa-ellipsis-h"></i>
          <span>Más</span>
        </button>
      </div>
    </div>
  );
};

export default Inversiones;