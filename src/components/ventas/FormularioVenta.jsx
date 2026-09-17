import React from 'react';

const FormularioVenta = ({
  clientes,
  clienteSeleccionado,
  setClienteSeleccionado,
  metodoPago,
  setMetodoPago,
  banco,
  setBanco,
  fechaVencimiento,
  setFechaVencimiento,
  // NUEVOS CAMPOS DE PAGO
  efectivo,
  setEfectivo,
  tarjeta,
  setTarjeta,
  transferencia,
  setTransferencia,
  vuelto,
  setVuelto,
  totalVenta
}) => {
  // Total pagado (contado o abono en crédito)
  const totalPagado = (parseFloat(efectivo) || 0) + (parseFloat(tarjeta) || 0) + (parseFloat(transferencia) || 0);
  const saldoRestante = totalVenta - totalPagado;

  // Auto-calcular vuelto cuando el efectivo supera el total (solo contado)
  const handleEfectivoChange = (valor) => {
    setEfectivo(valor);
    
    if (metodoPago === 'contado') {
      const efectivoNum = parseFloat(valor) || 0;
      const otrosPagos = (parseFloat(tarjeta) || 0) + (parseFloat(transferencia) || 0);
      const totalConEfectivo = efectivoNum + otrosPagos;
      
      if (totalConEfectivo > totalVenta) {
        setVuelto((totalConEfectivo - totalVenta).toFixed(2));
      } else {
        setVuelto('0.00');
      }
    }
  };

  return (
    <div className="formulario-venta">
      <div className="formulario-grid">
        {/* CLIENTE */}
        <div className="form-grupo">
          <label className="form-label">
            <i className="fas fa-user"></i> Cliente
          </label>
          <select
            value={clienteSeleccionado}
            onChange={(e) => setClienteSeleccionado(e.target.value)}
            className="form-select"
          >
            <option value="general">Cliente General</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {/* TIPO DE PAGO */}
        <div className="form-grupo">
          <label className="form-label">
            <i className="fas fa-money-bill"></i> Tipo de Pago
          </label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="form-select"
          >
            <option value="contado">Contado</option>
            <option value="credito">Crédito (8 días)</option>
          </select>
        </div>

        {/* BANCO */}
        {metodoPago === 'contado' && (
          <div className="form-grupo">
            <label className="form-label">
              <i className="fas fa-university"></i> Banco (opcional)
            </label>
            <select
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              className="form-select"
            >
              <option value="">Sin banco</option>
              <option value="ficohsa">Ficohsa</option>
              <option value="lafise">Lafise</option>
              <option value="banpro">Banpro</option>
              <option value="avanz">Avanz</option>
              <option value="bac">BAC</option>
              <option value="bdf">BDF</option>
            </select>
          </div>
        )}

        {/* FECHA VENCIMIENTO */}
        {metodoPago === 'credito' && (
          <div className="form-grupo">
            <label className="form-label">
              <i className="fas fa-calendar"></i> Fecha Vencimiento
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="form-input"
            />
          </div>
        )}
      </div>

      {/* ===== DESGLOSE DE PAGO (CONTADO) ===== */}
      {metodoPago === 'contado' && totalVenta > 0 && (
        <div className="desglose-pago">
          <h4 className="desglose-titulo">
            <i className="fas fa-coins"></i> Desglose del Pago
          </h4>
          
          <div className="desglose-grid">
            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-money-bill-wave"></i> Efectivo
              </label>
              <input
                type="number"
                value={efectivo}
                onChange={(e) => handleEfectivoChange(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-credit-card"></i> Tarjeta
              </label>
              <input
                type="number"
                value={tarjeta}
                onChange={(e) => setTarjeta(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-exchange-alt"></i> Transferencia
              </label>
              <input
                type="number"
                value={transferencia}
                onChange={(e) => setTransferencia(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-undo"></i> Vuelto
              </label>
              <input
                type="number"
                value={vuelto}
                onChange={(e) => setVuelto(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* RESUMEN DEL PAGO */}
          <div className="resumen-pago">
            <div className="resumen-item">
              <span>Total Factura:</span>
              <strong>C${totalVenta.toFixed(2)}</strong>
            </div>
            <div className="resumen-item">
              <span>Total Pagado:</span>
              <strong style={{ color: totalPagado >= totalVenta ? '#2e7d32' : '#e65100' }}>
                C${totalPagado.toFixed(2)}
              </strong>
            </div>
            {saldoRestante > 0 && (
              <div className="resumen-item resumen-faltante">
                <span>Falta por pagar:</span>
                <strong>C${saldoRestante.toFixed(2)}</strong>
              </div>
            )}
            {parseFloat(vuelto) > 0 && (
              <div className="resumen-item resumen-vuelto">
                <span>Vuelto:</span>
                <strong>C${parseFloat(vuelto).toFixed(2)}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ABONO INICIAL (CRÉDITO) ===== */}
      {metodoPago === 'credito' && totalVenta > 0 && (
        <div className="desglose-pago">
          <h4 className="desglose-titulo">
            <i className="fas fa-hand-holding-usd"></i> Abono Inicial (opcional)
          </h4>
          
          <div className="desglose-grid">
            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-money-bill-wave"></i> Abono en Efectivo
              </label>
              <input
                type="number"
                value={efectivo}
                onChange={(e) => setEfectivo(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-credit-card"></i> Abono con Tarjeta
              </label>
              <input
                type="number"
                value={tarjeta}
                onChange={(e) => setTarjeta(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-grupo">
              <label className="form-label">
                <i className="fas fa-exchange-alt"></i> Abono por Transferencia
              </label>
              <input
                type="number"
                value={transferencia}
                onChange={(e) => setTransferencia(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* RESUMEN DEL CRÉDITO */}
          <div className="resumen-pago">
            <div className="resumen-item">
              <span>Total Factura:</span>
              <strong>C${totalVenta.toFixed(2)}</strong>
            </div>
            <div className="resumen-item">
              <span>Abono Inicial:</span>
              <strong style={{ color: '#2e7d32' }}>
                C${totalPagado.toFixed(2)}
              </strong>
            </div>
            <div className="resumen-item resumen-faltante">
              <span>Saldo Pendiente:</span>
              <strong>C${saldoRestante.toFixed(2)}</strong>
            </div>
          </div>

          <div className="aviso-credito">
            <i className="fas fa-info-circle"></i>
            <span>
              Esta venta se registrará como <strong>crédito a 8 días</strong>. 
              {totalPagado > 0 && (
                <> El cliente abona <strong>C${totalPagado.toFixed(2)}</strong> ahora y queda un saldo pendiente de <strong>C${saldoRestante.toFixed(2)}</strong>.</>
              )}
              {totalPagado === 0 && (
                <> El saldo pendiente completo es de <strong>C${totalVenta.toFixed(2)}</strong>.</>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioVenta;