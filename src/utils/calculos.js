// para realizar los cálculos del total de las facturas

//suma de (cantidad × precio) de las líneas de materiales
export function calcularTotalMateriales(conceptos) {
    return conceptos.reduce((suma, c) => {
        const cantidad = Number(c.cantidad) || 0
        const precio = Number(c.precioUnitario) || 0
        return suma + cantidad * precio
    }, 0)
}

// Base imponible = total de materiales + mano de obra
export function calcularBaseImponible(totalMateriales, manoDeObra) {
    return totalMateriales + (Number(manoDeObra) || 0)
}

// Total = base imponible + IVA aplicado sobre esa base
export function calcularTotal(baseImponible, iva) {
    return baseImponible + baseImponible * (iva / 100)
}

