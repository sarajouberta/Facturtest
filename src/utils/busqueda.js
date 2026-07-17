import { normalizarMatricula } from './matricula'

// Filtra las facturas por matrícula (texto) y por fecha (año/mes).
// La fecha se guarda como "AAAA-MM-DD", así que el año son los 4 primeros
// caracteres y el mes los dos del medio.
// Cada criterio vacío ('') no filtra; los tres se combinan con Y.
export function filtrarFacturas(facturas, { texto = '', anio = '', mes = '' } = {}) {
  const terminoMatricula = normalizarMatricula(texto)

  return facturas.filter((f) => {
    const coincideMatricula =
      terminoMatricula === '' ||
      normalizarMatricula(f.vehiculo?.matricula).includes(terminoMatricula)

    const fecha = f.fecha ?? '' // "AAAA-MM-DD"
    const coincideAnio = anio === '' || fecha.slice(0, 4) === anio
    const coincideMes = mes === '' || fecha.slice(5, 7) === mes

    return coincideMatricula && coincideAnio && coincideMes
  })
}

// Devuelve la factura MÁS RECIENTE con esa matrícula exacta, o null si no hay
// ninguna. Sirve para reconocer un vehículo recurrente y ofrecer rellenar sus
// datos. Aquí la comparación es exacta (===), no parcial: buscamos ese vehículo.
export function buscarPorMatricula(facturas, matricula) {
  const objetivo = normalizarMatricula(matricula)
  if (objetivo === '') return null

  const coincidencias = facturas.filter(
    (f) => normalizarMatricula(f.vehiculo?.matricula) === objetivo
  )
  if (coincidencias.length === 0) return null

  // La fecha "AAAA-MM-DD" ordena bien como texto, así que la mayor es la más reciente.
  return coincidencias.reduce((a, b) => ((b.fecha ?? '') > (a.fecha ?? '') ? b : a))
}
