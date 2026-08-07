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

/* ¿Ese número ya está usado por otra factura?
   El número se sugiere solo, pero el campo es editable: sin esta comprobación se
   pueden emitir dos facturas con el mismo número, y la numeración correlativa sin
   duplicados es un requisito legal.
   - Se compara como texto normalizado, para que convivan los números guardados como
     número (46) y como texto ('46'), y también los del formato antiguo ('F-2026-001').
   - `idActual` permite excluir la propia factura, para cuando se pueda editar una ya
     creada: si no, se detectaría a sí misma como duplicada. */
export function numeroYaUsado(facturas, numero, idActual = null) {
    const buscado = String(numero ?? '').trim()
    if (buscado === '') return false
    return (facturas ?? []).some(
        (f) => f.id !== idActual && String(f.numero ?? '').trim() === buscado,
    )
}
