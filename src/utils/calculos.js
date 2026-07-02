//para realizar los cálculos del total de las facturas

//Suma de (cantidad × precio unitario) de todas las líneas
export function calcularBaseImponible(conceptos) {
    return conceptos.reduce((suma, c) => suma + c.cantidad * c.precioUnitario, 0)
}

//Total = base imponible + IVA aplicado sobre esa base
export function calcularTotal(baseImponible, iva) {
    return baseImponible + baseImponible * (iva / 100)
}