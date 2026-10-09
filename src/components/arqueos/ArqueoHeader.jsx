import { formatFechaNicaragua } from './utils'

const ArqueoHeader = ({ ultimoArqueo, loading, calculando, onAbrirModal }) => (
  <div className="arqueos-header">
    <div>
      <h1 className="arqueos-titulo">Arqueos de Caja</h1>
      <p className="arqueos-subtitulo">Cierre de turno y control de efectivo</p>
      {ultimoArqueo && (
        <div className="ultimo-arqueo-info desktop-only">
          <span className="info-label">Último arqueo:</span>
          <span className="info-valor">{formatFechaNicaragua(ultimoArqueo.fecha)}</span>
        </div>
      )}
    </div>
    <div className="header-buttons">
      <button
        onClick={onAbrirModal}
        className="btn-arquear-turno"
        disabled={loading || calculando}
      >
        {calculando
          ? <><div className="spinner-small"></div>Calculando...</>
          : <>💰 Arqueo de Turno</>}
      </button>
    </div>
  </div>
)

export default ArqueoHeader