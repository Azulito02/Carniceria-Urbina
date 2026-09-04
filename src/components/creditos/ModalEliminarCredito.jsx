// src/components/creditos/ModalEliminarCredito.jsx
import { useState } from 'react';
import { supabase } from '../../database/supabase';
import './ModalEliminarCredito.css';

const ModalEliminarCredito = ({ 
  isOpen, 
  onClose, 
  onCreditoEliminado, 
  credito 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('creditos')
        .delete()
        .eq('id', credito.id);

      if (deleteError) throw deleteError;

      onCreditoEliminado();
      onClose();

    } catch (err) {
      console.error('Error eliminando crédito:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !credito) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">Eliminar Crédito</h2>
          <button className="modal-cerrar" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="form-error">
              <span>❌ {error}</span>
            </div>
          )}

          <div className="eliminar-confirmacion">
            <div className="eliminar-icono">⚠️</div>
            <p className="eliminar-texto">
              ¿Estás seguro de eliminar el crédito <strong>#{credito.id}</strong>?
            </p>
            <div className="eliminar-detalles">
              <p><strong>Cliente:</strong> {credito.cliente_nombre || 'Sin cliente'}</p>
              <p><strong>Total:</strong> C${parseFloat(credito.monto_total || 0).toFixed(2)}</p>
              <p><strong>Saldo Pendiente:</strong> C${parseFloat(credito.saldo_pendiente || 0).toFixed(2)}</p>
              <p><strong>Estado:</strong> {credito.estado || 'Desconocido'}</p>
            </div>
            <p className="eliminar-advertencia">
              ⚠️ Esta acción es irreversible. Se eliminarán todos los abonos asociados a este crédito.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-modal-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn-modal-eliminar" 
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminarCredito;