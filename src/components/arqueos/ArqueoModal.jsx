const ArqueoModal = ({
  abierto, resumenTurno, efectivoContado, loading,
  onCambiarEfectivo, onCerrar, onConfirmar
}) => {
  if (!abierto || !resumenTurno) return null

  const diferencia = parseFloat(efectivoContado || 0) - (resumenTurno.efectivoNeto || 0)

  return (
    <div className="modal-overlay">
      <div className="modal-container arqueo-modal">
        <div className="modal-header">
          <h3 className="modal-titulo">Arqueo de Turno</h3>
          <button onClick={onCerrar} className="modal-cerrar">×</button>
        </div>

        <div className="modal-body">
          <div className="periodo-info">
            <p className="periodo-texto">
              <strong>Período:</strong> Desde {resumenTurno.fechaDesde} hasta {resumenTurno.fechaHasta}
            </p>
          </div>

          <div className="resumen-grid">
            {/* Ingresos */}
            <div className="resumen-columna ingresos-col">
              <h4 className="resumen-subtitulo">💰 EFECTIVO PARA CAJA</h4>
              <div className="resumen-item">
                <span className="resumen-label">Ventas en efectivo:</span>
                <span className="resumen-valor positivo">C${(resumenTurno.totalVentasEfectivo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className="resumen-cantidad">({resumenTurno.cantidadVentasEfectivo || 0} ventas)</span>
              </div>
              <div className="resumen-item">
                <span className="resumen-label">Abonos en efectivo:</span>
                <span className="resumen-valor positivo">C${(resumenTurno.totalAbonosEfectivo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className="resumen-cantidad">({resumenTurno.cantidadAbonosEfectivo || 0} abonos)</span>
              </div>

              <h4 className="resumen-subtitulo" style={{ marginTop: '20px' }}>💳 OTROS MÉTODOS</h4>
              <div className="resumen-item">
                <span className="resumen-label">Ventas con tarjeta:</span>
                <span className="resumen-valor tarjeta">C${(resumenTurno.totalVentasTarjeta || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className="resumen-cantidad">({resumenTurno.cantidadVentasTarjeta || 0} ventas)</span>
              </div>
              <div className="resumen-item">
                <span className="resumen-label">Ventas con transferencia:</span>
                <span className="resumen-valor transferencia">C${(resumenTurno.totalVentasTransferencia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className="resumen-cantidad">({resumenTurno.cantidadVentasTransferencia || 0} ventas)</span>
              </div>
              <div className="resumen-item">
                <span className="resumen-label">Abonos con tarjeta:</span>
                <span className="resumen-valor tarjeta">C${(resumenTurno.abonosTarjeta || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className="resumen-cantidad">({resumenTurno.cantidadAbonosTarjeta || 0} abonos)</span>
              </div>
              <div className="resumen-item">
                <span className="resumen-label">Abonos con transferencia:</span>
                <span className="resumen-valor transferencia">C${(resumenTurno.abonosTransferencia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className="resumen-cantidad">({resumenTurno.cantidadAbonosTransferencia || 0} abonos)</span>
              </div>
              <div className="resumen-item">
                <span className="resumen-label">Ventas a crédito:</span>
                <span className="resumen-valor credito">C${(resumenTurno.totalCreditos || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className="resumen-cantidad">({resumenTurno.cantidadCreditos || 0} créditos)</span>
              </div>
            </div>

            {/* Egresos + cálculo */}
            <div className="resumen-columna egresos-col">
              <h4 className="resumen-subtitulo">📉 EGRESOS</h4>
              <div className="resumen-item">
                <span className="resumen-label">Gastos:</span>
                <span className="resumen-valor negativo">C${(resumenTurno.totalGastos || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className="resumen-cantidad">({resumenTurno.cantidadGastos || 0} gastos)</span>
              </div>

              <div className="resumen-separador"></div>

              <div className="resumen-calculo">
                <h5 className="calculo-titulo">💰 CÁLCULO DE EFECTIVO PARA CAJA</h5>
                <div className="calculo-item">
                  <span>Ventas en efectivo:</span>
                  <span>C${(resumenTurno.totalVentasEfectivo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="calculo-item">
                  <span>+ Abonos en efectivo:</span>
                  <span>C${(resumenTurno.totalAbonosEfectivo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="calculo-subtotal">
                  <span>EFECTIVO BRUTO:</span>
                  <span className="subtotal-valor">C${(resumenTurno.totalEfectivo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="calculo-item">
                  <span>- Gastos:</span>
                  <span>C${(resumenTurno.totalGastos || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="calculo-total">
                  <span>EFECTIVO NETO ESPERADO:</span>
                  <span className="neto-esperado">C${(resumenTurno.efectivoNeto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="efectivo-contado">
                <label className="contado-label">💵 EFECTIVO REAL CONTADO:</label>
                <div className="contado-input-container">
                  <span className="contado-prefijo">C$</span>
                  <input
                    type="number"
                    value={efectivoContado}
                    onChange={(e) => onCambiarEfectivo(e.target.value)}
                    className="contado-input"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    autoFocus
                  />
                </div>
                {efectivoContado && resumenTurno.efectivoNeto !== undefined && (
                  <div className="diferencia">
                    <span>Diferencia:</span>
                    <span className={`diferencia-valor ${diferencia >= 0 ? 'positivo' : 'negativo'}`}>
                      C${Math.abs(diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      {diferencia > 0 ? ' (Sobrante)' : ' (Faltante)'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="advertencia-arqueo">
            <p className="advertencia-texto">
              ⚠️ <strong>ATENCIÓN:</strong> Al confirmar este arqueo se procesarán:
            </p>
            <div className="advertencia-columnas">
              <div className="advertencia-col">
                <p className="advertencia-subtitulo">🗑️ ELIMINADOS:</p>
                <ul className="advertencia-lista">
                  <li><span className="eliminar-item">{resumenTurno.cantidadVentas || 0} ventas</span></li>
                  <li><span className="eliminar-item">{resumenTurno.cantidadGastos || 0} gastos</span></li>
                </ul>
              </div>
              <div className="advertencia-col">
                <p className="advertencia-subtitulo">✅ PROCESADOS:</p>
                <ul className="advertencia-lista">
                  <li><span className="mantener-item">{resumenTurno.cantidadAbonosEfectivo || 0} abonos efectivo</span></li>
                  <li><span className="mantener-item">{resumenTurno.cantidadAbonosTarjeta || 0} abonos tarjeta</span></li>
                  <li><span className="mantener-item">{resumenTurno.cantidadAbonosTransferencia || 0} abonos transf.</span></li>
                  <li><span className="mantener-item">{resumenTurno.cantidadCreditos || 0} créditos (mantenidos)</span></li>
                </ul>
              </div>
            </div>
            <div className="advertencia-footer">
              <p className="advertencia-nota">
                💾 <strong>Nota:</strong> El historial se guarda en "facturados". Los abonos se marcan como procesados y solo se cuentan UNA VEZ.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onCerrar} className="btn btn-secondary" disabled={loading}>Cancelar</button>
          <button onClick={onConfirmar} className="btn btn-success" disabled={!efectivoContado || loading}>
            {loading ? <><div className="spinner-small"></div>Procesando...</> : '✅ Confirmar Arqueo'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ArqueoModal