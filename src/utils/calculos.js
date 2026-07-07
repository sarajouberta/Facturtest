// para realizar los cálculos del total de las facturas

/*Nota: redondea a 2 decimales para evitar los errores de la coma flotante
// (p. ej. 3 × 0,10 daría 0.30000000000000004 sin esto) 
// Math.round(n * 100) / 100:
  1. Multiplica por 100: mueve los céntimos a la parte entera. 0.30000000000000004 * 100 = 30.000000000000004
  2. Math.round: redondea al entero más cercano → 30 (limpio, sin la basurilla de detrás).
  3. Divide por 100: vuelve a euros */
function redondear(n) {
    return Math.round(n * 100) / 100
}

//uma de (cantidad × precio) de las líneas de materiales
export function calcularTotalMateriales(conceptos) {
    const total = conceptos.reduce((suma, c) => {
        const cantidad = Number(c.cantidad) || 0
        const precio = Number(c.precioUnitario) || 0
        return suma + cantidad * precio
    }, 0)
    return redondear(total)
}

// Base imponible = total de materiales + mano de obra
export function calcularBaseImponible(totalMateriales, manoDeObra) {
    return redondear(totalMateriales + (Number(manoDeObra) || 0))
}

// Total = base imponible + IVA aplicado sobre esa base
export function calcularTotal(baseImponible, iva) {
    return redondear(baseImponible + baseImponible * (iva / 100))
}

