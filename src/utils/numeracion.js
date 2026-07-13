// Genera el siguiente número de factura (cambio a numeración corrida, solo dígitos: 46, 47…).
// -facturas: las que ya existen en la BD
// -numeroInicial: punto de partida que el taller fija en Configuración
export function generarSiguienteNumero(facturas, numeroInicial = 1) {
    //el correlativo más alto que ya se ha usado (ignora textos no numéricos)
    const maxUsado = facturas.reduce((max, f) => {
        const n = parseInt(f.numero, 10)   //para descartar NaN
        return Number.isNaN(n) ? max : Math.max(max, n)
    }, 0)

    //el siguiente es el mayor entre "el correlativo real" y "el punto de partida" puesto en COnfig:
    const inicial = Number(numeroInicial) || 1
    return String(Math.max(maxUsado + 1, inicial))
}
