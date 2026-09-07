/* Preparación de las líneas de la factura antes de guardarlas.
   Hace dos cosas a la vez, y las dos importan:

   1. NORMALIZAR. Los campos numéricos llegan como cadena (el tiempo, que es un
      input de texto) o como NaN (lo que devuelve valueAsNumber cuando el campo
      está vacío). Ninguna de las dos cosas debe escribirse en Firestore.

   2. DESCARTAR LAS LÍNEAS VACÍAS. El formulario arranca siempre con una línea de
      cada tipo; si no se rellena ni se borra, se guardaba tal cual y aparecía en
      la factura como una fila en blanco con importes a 0. */

import { numeroDesdeTexto, formatearDecimal } from './formato'

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

/* Las líneas de mano de obra listas para el formulario. Son tres casos y el
   orden importa: una factura nueva también tiene manoDeObra (se guarda el total
   ya calculado), así que preguntar antes por el importe le crearía una línea
   inventada además de las suyas, y duplicaría el total. */
function lineasManoDeObraParaFormulario(factura) {
    if (factura?.lineasManoDeObra?.length > 0) {
        return factura.lineasManoDeObra.map((linea) => ({
            ...linea,
            horas: formatearDecimal(linea?.horas),
            precioHora: formatearDecimal(linea?.precioHora),
        }))
    }

    /* Factura anterior al desglose por tareas: guardaba un único importe y no
       tiene líneas. Se convierte en una sola línea de 1 hora a ese precio, de
       modo que el total siga siendo el mismo al volver a guardarla. */
    if (Number(factura?.manoDeObra) > 0) {
        return [{
            descripcion: 'Mano de obra',
            horas: formatearDecimal(1),
            precioHora: formatearDecimal(factura.manoDeObra),
        }]
    }

    return []
}

/* Prepara una factura guardada para volcarla en el formulario.
   Es la inversa de las dos funciones de arriba, que convierten lo tecleado
   en datos para guardar; esta convierte lo guardado en algo que el formulario
   pueda editar.

   Los importes y las horas se guardan como número, pero sus campos son de texto
   para admitir la coma: sin formatear aparecería 46.5 en vez de 46,50.

   El id se descarta porque lo añade useFactura al leer, no es un campo del
   documento; guardarlo metería dentro de la factura lo que ya dice su dirección. */
export function facturaAFormulario(factura) {
    const { id: _id, ...resto } = factura ?? {}
    return {
        ...resto,
        conceptos: (factura?.conceptos ?? []).map((concepto) => ({
            ...concepto,
            precioUnitario: formatearDecimal(concepto?.precioUnitario),
        })),
        lineasManoDeObra: lineasManoDeObraParaFormulario(factura),
    }
}
