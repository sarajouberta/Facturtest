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

/* Mano de obra de una línea = horas × precio por hora.
   Las horas van en decimal (0,80 = 48 min), que es como se apunta y como se
   imprime en el sector: la misma unidad en todas partes, sin conversiones. */
export function calcularManoDeObra(horas, precioHora) {
    const h = Number(horas) || 0
    const p = Number(precioHora) || 0
    return redondear(h * p)
}

/* Suma la mano de obra de todas las líneas. Cada línea es una tarea con sus
   propias horas y su propia tarifa, así que se calcula una a una y se suma; no
   vale multiplicar un total de horas por una tarifa única. */
export function calcularTotalManoDeObra(lineas) {
    const total = (lineas ?? []).reduce(
        (suma, linea) => suma + calcularManoDeObra(linea?.horas, linea?.precioHora),
        0,
    )
    return redondear(total)
}

// Total = base imponible + IVA aplicado sobre esa base
export function calcularTotal(baseImponible, iva) {
    return redondear(baseImponible + baseImponible * (iva / 100))
}


