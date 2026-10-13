
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabase';
import Encabezado from '../components/Encabezado';

import TablaCreditos from '../components/creditos/TablaCreditos';
import ModalAgregarCredito from '../components/creditos/ModalAgregarCredito';
import ModalEditarCredito from '../components/creditos/ModalEditarCredito';
import ModalEliminarCredito from '../components/creditos/ModalEliminarCredito';

import './Creditos.css';

function Creditos() {
  const navigate = useNavigate();

  const [creditos, setCreditos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  const [creditoSeleccionado, setCreditoSeleccionado] =
    useState(null);

  // Cargar créditos y clientes desde Supabase
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [creditosResp, clientesResp] = await Promise.all([
        supabase
          .from('creditos')
          .select('*, clientes (id, nombre)')
          .order('id', { ascending: false }),

        supabase
          .from('clientes')
          .select('id, nombre')
          .order('nombre', { ascending: true })
      ]);

      if (creditosResp.error) {
        throw creditosResp.error;
      }

      if (clientesResp.error) {
        throw clientesResp.error;
      }

      const creditosNormalizados = (creditosResp.data || []).map(
        (credito) => ({
          ...credito,
          cliente_nombre:
            credito.clientes?.nombre ||
            credito.cliente?.nombre ||
            'Cliente no disponible',

          monto_total: Number(credito.monto_total || 0),
          monto_pagado: Number(credito.monto_pagado || 0),
          saldo_pendiente: Number(credito.saldo_pendiente || 0)
        })
      );

      setCreditos(creditosNormalizados);
      setClientes(clientesResp.data || []);
    } catch (err) {
      console.error('Error cargando créditos:', err);

      setError(
        'No se pudieron cargar los créditos: ' +
        (err.message || 'Error desconocido')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Determinar el estado que se muestra en la tabla
  const getEstadoCredito = (credito) => {
    if (Number(credito.saldo_pendiente || 0) <= 0) {
      return {
        texto: 'Pagado',
        clase: 'pagado'
      };
    }

    if (
      credito.estado === 'anulado' ||
      credito.estado === 'cancelado'
    ) {
      return {
        texto: 'Cancelado',
        clase: 'cancelado'
      };
    }

    const vencido =
      credito.estado === 'vencido' ||
      (
        credito.fecha_fin &&
        new Date(`${credito.fecha_fin}T23:59:59`) < new Date()
      );

    if (vencido) {
      return {
        texto: 'Vencido',
        clase: 'vencido'
      };
    }

    return {
      texto: 'Activo',
      clase: 'activo'
    };
  };

  // Buscar por número, cliente o estado
  const termino = busqueda.trim().toLowerCase();

  const creditosFiltrados = creditos.filter((credito) => {
    if (!termino) return true;

    return (
      String(credito.id).includes(termino) ||
      (credito.cliente_nombre || '')
        .toLowerCase()
        .includes(termino) ||
      (credito.estado || '')
        .toLowerCase()
        .includes(termino)
    );
  });

  // Cerrar todos los modales
  const cerrarModales = () => {
    setModalAgregar(false);
    setModalEditar(false);
    setModalEliminar(false);
    setCreditoSeleccionado(null);
  };

  // Actualizar la información después de una operación
  const creditoGuardado = async () => {
    cerrarModales();
    await cargarDatos();
  };

  const formatoMoneda = (cantidad) =>
    Number(cantidad || 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const saldoTotal = creditos.reduce(
    (total, credito) =>
      total + Math.max(0, Number(credito.saldo_pendiente || 0)),
    0
  );

  return (
    <div className="creditos-container">
      <Encabezado />

      <main className="creditos-content">
        <div className="creditos-header">
          <div>
            <h1>💳 Créditos</h1>
            <p>
              Administración de créditos y saldos pendientes
              de clientes.
            </p>
          </div>

          <div className="creditos-acciones">
            <button
              type="button"
              onClick={cargarDatos}
              disabled={loading}
            >
              Actualizar
            </button>

            <button
              type="button"
              onClick={() => setModalAgregar(true)}
            >
              + Nuevo crédito
            </button>
          </div>
        </div>

        {error && (
          <div className="creditos-error" role="alert">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Cerrar error"
            >
              ✕
            </button>
          </div>
        )}

        <section className="creditos-resumen">
          <div className="credito-resumen-card">
            <span>Créditos registrados</span>
            <strong>{creditos.length}</strong>
          </div>

          <div className="credito-resumen-card">
            <span>Saldo pendiente total</span>
            <strong>C${formatoMoneda(saldoTotal)}</strong>
          </div>
        </section>

        <div className="creditos-buscador">
          <label htmlFor="buscar-creditos">
            Buscar por cliente, número o estado
          </label>

          <input
            id="buscar-creditos"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Escribe para buscar..."
          />

          <span>
            {creditosFiltrados.length} de {creditos.length} créditos
          </span>
        </div>

        <TablaCreditos
          creditos={creditosFiltrados}
          loading={loading}
          onEditar={(credito) => {
            setCreditoSeleccionado(credito);
            setModalEditar(true);
          }}
          onEliminar={(credito) => {
            setCreditoSeleccionado(credito);
            setModalEliminar(true);
          }}
          getEstadoCredito={getEstadoCredito}
        />
      </main>

      <ModalAgregarCredito
        isOpen={modalAgregar}
        onClose={cerrarModales}
        onCreditoAgregado={creditoGuardado}
        clientes={clientes}
      />

      <ModalEditarCredito
        isOpen={modalEditar}
        onClose={cerrarModales}
        onCreditoEditado={creditoGuardado}
        credito={creditoSeleccionado}
        clientes={clientes}
      />

      <ModalEliminarCredito
        isOpen={modalEliminar}
        onClose={cerrarModales}
        onCreditoEliminado={creditoGuardado}
        credito={creditoSeleccionado}
      />

      <nav className="bottom-nav">
        <button
          type="button"
          className="nav-item"
          onClick={() => navigate('/')}
        >
          <i className="fas fa-home" />
          <span>Inicio</span>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={() => navigate('/clientes')}
        >
          <i className="fas fa-users" />
          <span>Clientes</span>
        </button>

        <button
          type="button"
          className="nav-item active"
          onClick={() => navigate('/creditos')}
        >
          <i className="fas fa-credit-card" />
          <span>Créditos</span>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={() => navigate('/abonos')}
        >
          <i className="fas fa-money-bill-wave" />
          <span>Abonos</span>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={() => navigate('/ventas')}
        >
          <i className="fas fa-cash-register" />
          <span>Ventas</span>
        </button>
      </nav>
    </div>
  );
}

export default Creditos;
