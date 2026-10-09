const ArqueoResumenMobile = ({ visible, resumen }) => {
  if (!visible) return null

  return (
    <div className="resumen-mobile mobile-only">
      <div className="resumen-mobile-item">
        <span className="resumen-mobile-label">Arqueos</span>
        <span className="resumen-mobile-value">{resumen.totalArqueos}</span>
      </div>
      <div className="resumen-mobile-item">
        <span className="resumen-mobile-label">Total Ventas</span>
        <span className="resumen-mobile-value positivo">C${resumen.totalVentas.toFixed(2)}</span>
      </div>
      <div className="resumen-mobile-item">
        <span className="resumen-mobile-label">Total Gastos</span>
        <span className="resumen-mobile-value negativo">C${resumen.totalGastos.toFixed(2)}</span>
      </div>
      <div className="resumen-mobile-item">
        <span className="resumen-mobile-label">Efectivo Total</span>
        <span className={`resumen-mobile-value ${resumen.totalEfectivo > 0 ? 'positivo' : 'negativo'}`}>
          C${resumen.totalEfectivo.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

export default ArqueoResumenMobile