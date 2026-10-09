import { formatFechaCorta } from './utils'

const ArqueoCardMobile = ({ arqueo, exportando, onExportarExcel, onExportarPDF }) => {
  const dif = parseFloat(arqueo.diferencia_efectivo || 0)

  const detalles = [
    ['Ventas Crédito', arqueo.total_credito, 'credito'],
    ['💰 Ventas Ef.', arqueo.total_ventas_efectivo, 'efectivo'],
    ['💳 Ventas Tarj.', arqueo.total_ventas_tarjeta, 'tarjeta'],
    ['🏦 Ventas Transf.', arqueo.total_ventas_transferencia, 'transferencia'],
    ['💰 Abonos Ef.', arqueo.total_abonos_efectivo, 'efectivo'],
    ['💳 Abonos Tarj.', arqueo.total_abonos_tarjeta, 'tarjeta'],
    ['🏦 Abonos Transf.', arqueo.total_abonos_transferencia, 'transferencia'],
    ['Efectivo Bruto', arqueo.total_efectivo, 'efectivo'],
    ['Gastos', arqueo.total_gastos, 'negativo'],
    ['Efectivo en Caja', arqueo.efectivo_en_caja, 'positivo']
  ]

  return (
    <div className="arqueo-card-mobile">
      <div className="arqueo-card-header">
        <div className="arqueo-fecha-mobile">
          <span className="fecha-dia">{formatFechaCorta(arqueo.fecha)}</span>
          <span className="fecha-usuario">{arqueo.usuario || 'Sistema'}</span>
        </div>
        <div className={`arqueo-estado-mobile ${dif === 0 ? 'exacto' : dif > 0 ? 'sobrante' : 'faltante'}`}>
          {dif === 0 ? '✅' : dif > 0 ? '💰' : '📉'}
        </div>
      </div>

      <div className="arqueo-resumen-mobile">
        <div className="resumen-row">
          <div className="resumen-col">
            <span className="resumen-label-mobile">Ventas</span>
            <span className="resumen-valor-mobile positivo">C${parseFloat(arqueo.total_ventas || 0).toFixed(2)}</span>
          </div>
          <div className="resumen-col">
            <span className="resumen-label-mobile">Efectivo</span>
            <span className="resumen-valor-mobile efectivo">C${parseFloat(arqueo.total_efectivo || 0).toFixed(2)}</span>
          </div>
        </div>
        <div className="resumen-row">
          <div className="resumen-col">
            <span className="resumen-label-mobile">Gastos</span>
            <span className="resumen-valor-mobile negativo">C${parseFloat(arqueo.total_gastos || 0).toFixed(2)}</span>
          </div>
          <div className="resumen-col">
            <span className="resumen-label-mobile">En Caja</span>
            <span className={`resumen-valor-mobile ${parseFloat(arqueo.efectivo_en_caja || 0) > 0 ? 'positivo' : 'negativo'}`}>
              C${parseFloat(arqueo.efectivo_en_caja || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="arqueo-detalle-mobile">
        <div className="detalle-grid-mobile">
          {detalles.map(([label, valor, clase]) => (
            <div key={label} className="detalle-item-mobile">
              <span className="detalle-label-mobile">{label}</span>
              <span className={`detalle-valor-mobile ${clase}`}>C${parseFloat(valor || 0).toFixed(2)}</span>
            </div>
          ))}
          {dif !== 0 && (
            <div className="detalle-item-mobile full-width">
              <span className="detalle-label-mobile">Diferencia</span>
              <span className={`detalle-valor-mobile ${dif > 0 ? 'positivo' : 'negativo'}`}>
                C${Math.abs(dif).toFixed(2)} {dif > 0 ? '(Sobrante)' : '(Faltante)'}
              </span>
            </div>
          )}
        </div>

        <div className="detalle-actions-mobile">
          <button
            onClick={() => onExportarExcel(arqueo)}
            disabled={exportando[arqueo.id] === 'excel'}
            className="detalle-action-btn-mobile excel"
          >
            {exportando[arqueo.id] === 'excel'
              ? <><span className="spinner-mini"></span>Exportando...</>
              : <>📊 Excel</>}
          </button>
          <button
            onClick={() => onExportarPDF(arqueo)}
            disabled={exportando[arqueo.id] === 'pdf'}
            className="detalle-action-btn-mobile pdf"
          >
            {exportando[arqueo.id] === 'pdf'
              ? <><span className="spinner-mini"></span>Exportando...</>
              : <>📄 PDF</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ArqueoCardMobile