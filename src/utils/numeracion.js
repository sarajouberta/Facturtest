/*Filtra las facturas cuyo número empieza por F-2026-, extrae la parte numérica de cada una, coge la más alta, le suma 1 y la formatea a 3 dígitos con padStart(3, '0') (que
  rellena con ceros a la izquierda: 7 → 007). Si no hay ninguna aún, empieza en 001*/

//genera el siguiente número correlativo, tipo "F-2026-001"
export function generarSiguienteNumero(facturas, anio) {
    const prefijo = `F-${anio}-`

    // Nos quedamos solo con las facturas de este año
    const delAnio = facturas.filter((f) => f.numero?.startsWith(prefijo))

    // Buscamos el número de secuencia más alto usado
    const maxSecuencia = delAnio.reduce((max, f) => {
        const secuencia = parseInt(f.numero.slice(prefijo.length), 10)
        return secuencia > max ? secuencia : max
    }, 0)

    // El siguiente = el más alto + 1, con 3 dígitos (001, 002...)
    return `${prefijo}${String(maxSecuencia + 1).padStart(3, '0')}`
}
