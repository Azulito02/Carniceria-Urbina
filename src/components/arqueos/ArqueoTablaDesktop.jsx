import { formatFechaNicaragua } from './utils'

const ArqueoTablaDesktop = ({
  loading, arqueos, arqueosFiltrados, busqueda,
  exportando, onExportarExcel, onExportarPDF, onScroll
}) => (
  <>
    <div className="tabla-controls-container">
      <div className="tabla-info">
        <strong>{arqueosFiltrados.length}</strong> arqueos encontrados
        {busqueda && <span> · Búsqueda: "{busqueda}"</span>}
      </div>
      <div className="tabla-scroll-controls">
        <button className="btn-scroll" onClick={() => onScroll(-300)}>← Desplazar</button>
        <button className="btn-scroll" onClick={() => onScroll(300)}>Desplazar →</button>
      </div>
    </div>

    <div className="tabla-scroll-container desktop-only">
      <table className="tabla-arqueos">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Ventas Totales</th>
            <th>Ventas Crédito</th>
            <th>💰 Ventas Ef.</th>
            <th>💳 Ventas Tarj.</th>
            <th>🏦 Ventas Transf.</th>
            <th>💰 Abonos Ef.</th>
            <th>💳 Abonos Tarj.</th>
            <th>🏦 Abonos Transf.</th>
            <th>Efectivo Bruto</th>
            <th>Gastos</th>
            <th>Efectivo en Caja</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="13" className="cargando-mensaje"><div className="spinner"></div>Cargando arqueos...</td></tr>
          ) : arqueosFiltrados.length === 0 ? (
            <tr><td colSpan="13" className="sin-registros">
              {busqueda ? 'No se encontraron arqueos' : 'No hay arqueos registrados'}
            </td></tr>
          ) : arqueosFiltrados.map((a) => (
            <tr key={a.id} className="fila-arqueo">
              <td>{formatFechaNicaragua(a.fecha)}</td>
              <td><span className="valor-positivo">C${parseFloat(a.total_ventas || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></td>
              <td><span className="valor-credito">C${parseFloat(a.total_credito || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></td>
              <td><span className="badge-venta efectivo">💵 C${parseFloat(a.total_ventas_efectivo || 0).toFixed(2)}</span></td>
              <td><span className="badge-venta tarjeta">💳 C${parseFloat(a.total_ventas_tarjeta || 0).toFixed(2)}</span></td>
              <td><span className="badge-venta transferencia">🏦 C${parseFloat(a.total_ventas_transferencia || 0).toFixed(2)}</span></td>
              <td><span className="badge-abono efectivo">💵 C${parseFloat(a.total_abonos_efectivo || 0).toFixed(2)}</span></td>
              <td><span className="badge-abono tarjeta">💳 C${parseFloat(a.total_abonos_tarjeta || 0).toFixed(2)}</span></td>
              <td><span className="badge-abono transferencia">🏦 C${parseFloat(a.total_abonos_transferencia || 0).toFixed(2)}</span></td>
              <td><span className="valor-efectivo">C${parseFloat(a.total_efectivo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></td>
              <td><span className="valor-negativo">C${parseFloat(a.total_gastos || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></td>
              <td>
                <span className={`badge-caja ${parseFloat(a.efectivo_en_caja || 0) > 0 ? 'positivo' : 'negativo'}`}>
                  C${parseFloat(a.efectivo_en_caja || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </td>
              <td>
                <div className="acciones-container">
                  <button className="btn-accion btn-excel" onClick={() => onExportarExcel(a)} disabled={exportando[a.id] === 'excel'}>
                    {exportando[a.id] === 'excel'
                      ? <><span className="spinner-mini"></span>Exportando...</>
                      : <><span className="btn-icon">📊</span><span className="btn-text">Excel</span></>}
                  </button>
                  <button className="btn-accion btn-pdf" onClick={() => onExportarPDF(a)} disabled={exportando[a.id] === 'pdf'}>
                    {exportando[a.id] === 'pdf'
                      ? <><span className="spinner-mini"></span>Exportando...</>
                      : <><span className="btn-icon">📄</span><span className="btn-text">PDF</span></>}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {!loading && arqueosFiltrados.length > 0 && (
      <div className="tabla-controls-container" style={{ borderTop: '1px solid #e2e8f0', borderBottom: 'none' }}>
        <div className="tabla-info">Mostrando {arqueosFiltrados.length} de {arqueos.length} arqueos</div>
        <div className="tabla-scroll-controls">
          <button className="btn-scroll" onClick={() => onScroll(-300)}>← Desplazar</button>
          <button className="btn-scroll" onClick={() => onScroll(300)}>Desplazar →</button>
        </div>
      </div>
    )}
  </>
)

export default ArqueoTablaDesktop