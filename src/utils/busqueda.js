import { normalizarMatricula } from './matricula'

// Filtra las facturas por texto (nº de factura o matrícula) y por fecha (año/mes).
// La fecha se guarda como "AAAA-MM-DD", así que el año son los 4 primeros
// caracteres y el mes los dos del medio.
// Cada criterio vacío ('') no filtra; los tres se combinan con Y.
export function filtrarFacturas(facturas, { texto = '', anio = '', mes = '' } = {}) {
  const termino = texto.trim().toLowerCase()
  const terminoMatricula = normalizarMatricula(texto)

  return facturas.filter((f) => {
    const coincideTexto =
      termino === '' ||
      String(f.numero ?? '').toLowerCase().includes(termino) ||
      normalizarMatricula(f.vehiculo?.matricula).includes(terminoMatricula)

    const fecha = f.fecha ?? '' // "AAAA-MM-DD"
    const coincideAnio = anio === '' || fecha.slice(0, 4) === anio
    const coincideMes = mes === '' || fecha.slice(5, 7) === mes

    return coincideTexto && coincideAnio && coincideMes
  })
}
