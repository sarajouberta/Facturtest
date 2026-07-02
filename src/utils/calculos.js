//para realizar los cálculos del total de las facturas

//Suma de (cantidad × precio unitario) de todas las líneas: cuando un campo numérico está vacío, input devuelve NaN (not-a-number), y eso "contagiaría" el total como NaN. Se blinda la función:
export function calcularBaseImponible(conceptos) {
    return conceptos.reduce((suma, c) => {
      const cantidad = Number(c.cantidad) || 0
      const precio = Number(c.precioUnitario) || 0
      return suma + cantidad * precio
    }, 0)
}

//Total = base imponible + IVA aplicado sobre esa base
export function calcularTotal(baseImponible, iva) {
    return baseImponible + baseImponible * (iva / 100)
}