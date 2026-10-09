export const formatFechaNicaragua = (fechaISO) => {
  if (!fechaISO) return 'Fecha no disponible'
  const fechaUTC = new Date(fechaISO)
  const f = new Date(fechaUTC.getTime() - 6 * 60 * 60 * 1000)
  const dia = f.getDate().toString().padStart(2, '0')
  const mes = (f.getMonth() + 1).toString().padStart(2, '0')
  const anio = f.getFullYear()
  let horas = f.getHours()
  const minutos = f.getMinutes().toString().padStart(2, '0')
  const ampm = horas >= 12 ? 'p.m.' : 'a.m.'
  horas = horas % 12
  horas = horas ? horas.toString().padStart(2, '0') : '12'
  return `${dia}/${mes}/${anio} ${horas}:${minutos} ${ampm}`
}

export const formatFechaCorta = (fechaISO) => {
  if (!fechaISO) return 'Fecha no disponible'
  const fechaUTC = new Date(fechaISO)
  const f = new Date(fechaUTC.getTime() - 6 * 60 * 60 * 1000)
  const dia = f.getDate().toString().padStart(2, '0')
  const mes = (f.getMonth() + 1).toString().padStart(2, '0')
  const anio = f.getFullYear().toString().slice(-2)
  const horas = f.getHours()
  const minutos = f.getMinutes().toString().padStart(2, '0')
  return `${dia}/${mes}/${anio} ${horas}:${minutos}`
}