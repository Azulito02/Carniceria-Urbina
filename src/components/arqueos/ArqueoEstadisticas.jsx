const ArqueoEstadisticas = ({ arqueos, ultimoArqueo }) => {
  if (!ultimoArqueo) return null

  const items = [
    ['💰', `C$${parseFloat(ultimoArqueo.efectivo_en_caja || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Último efectivo'],
    ['📊', arqueos.length, 'Arqueos totales'],
    ['📈', `C$${arqueos.reduce((s, a) => s + parseFloat(a.total_ventas || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Total ventas'],
    ['📉', `C$${arqueos.reduce((s, a) => s + parseFloat(a.total_gastos || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Total gastos']
  ]

  return (
    <div className="estadisticas-arqueo desktop-only">
      {items.map(([icono, valor, label]) => (
        <div key={label} className="estadistica-card">
          <div className="estadistica-icono">{icono}</div>
          <div className="estadistica-contenido">
            <p className="estadistica-valor">{valor}</p>
            <p className="estadistica-label">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ArqueoEstadisticas