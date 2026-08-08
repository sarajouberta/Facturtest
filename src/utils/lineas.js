/* Preparación de las líneas de la factura antes de guardarlas.
   Hace dos cosas a la vez, y las dos importan:

   1. NORMALIZAR. Los campos numéricos llegan como cadena (el tiempo, que es un
      input de texto) o como NaN (lo que devuelve valueAsNumber cuando el campo
      está vacío). Ninguna de las dos cosas debe escribirse en Firestore.

   2. DESCARTAR LAS LÍNEAS VACÍAS. El formulario arranca siempre con una línea de
      cada tipo; si no se rellena ni se borra, se guardaba tal cual y aparecía en
      la factura como una fila en blanco con importes a 0. */

import { numeroDesdeTexto } from './formato'

function textoLimpio(valor) {
    return String(valor ?? '').trim()
}

/* Un material cuenta como vacío si no tiene descripción NI precio.
   La cantidad no sirve de señal: viene con un 1 por defecto que no significa que
   el usuario haya escrito nada. */
export function limpiarConceptos(conceptos) {
    return (conceptos ?? [])
        .map((concepto) => ({
            ...concepto,
            descripcion: textoLimpio(concepto?.descripcion),
            cantidad: Number(concepto?.cantidad) || 0,
            // El precio se teclea como texto y puede llevar coma ('46,50')
            precioUnitario: numeroDesdeTexto(concepto?.precioUnitario),
        }))
        .filter((concepto) => concepto.descripcion !== '' || concepto.precioUnitario > 0)
}

/* Una línea de mano de obra cuenta como vacía si no tiene descripción NI horas.
   La tarifa no sirve de señal: se rellena sola desde la configuración, así que
   una línea intacta ya viene con ella puesta.
   Las horas se teclean en un campo de texto y pueden llevar coma ('0,8'), por eso
   pasan por numeroDesdeTexto y no por Number a secas. */
export function limpiarLineasManoDeObra(lineas) {
    return (lineas ?? [])
        .map((linea) => ({
            ...linea,
            descripcion: textoLimpio(linea?.descripcion),
            horas: numeroDesdeTexto(linea?.horas),
            precioHora: numeroDesdeTexto(linea?.precioHora),
        }))
        .filter((linea) => linea.descripcion !== '' || linea.horas > 0)
}
