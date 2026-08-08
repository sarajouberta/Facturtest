// Formatos de presentación y lectura de números escritos a mano.

/* Un número con dos decimales y coma decimal española: 46.5 → '46,50'.
   Se usa tanto para importes como para horas. */
export function formatearDecimal(valor) {
    return (Number(valor) || 0).toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

/* Las horas de mano de obra se guardan y se muestran en decimal (0,80 = 48 min),
   que es el formato del sector: se comprobó en una factura de concesionario,
   donde 0,80 × 46,50 € = 37,20 €. */
export function formatearHoras(horas) {
    return formatearDecimal(horas)
}

/* Convierte a número lo que se teclea en un campo de texto, admitiendo la coma
   decimal española ('0,8'). Number('0,8') daría NaN, porque JavaScript solo
   entiende el punto. Devuelve 0 si no hay nada aprovechable. */
export function numeroDesdeTexto(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0
    return Number(String(valor ?? '').trim().replace(',', '.')) || 0
}
