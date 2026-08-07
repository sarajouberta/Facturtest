// Comprobación de que la configuración del taller está completa.
//
// Por qué existe esto y no son simplemente campos obligatorios del formulario:
// la configuración envejece. Cuando se añade un campo nuevo (el precio de mano de
// obra, el IVA…), las configuraciones ya guardadas se quedan sin él y nadie avisa.
// El onboarding no lo cubre, porque solo salta cuando NO hay configuración.
// Bloquear el guardado castigaría al usuario por un cambio nuestro, así que la app
// avisa pero no impide seguir.

// Campos que la app necesita, con el nombre que se le enseña al usuario.
const CAMPOS = [
    { clave: 'nombre', etiqueta: 'Nombre comercial' },
    { clave: 'nif', etiqueta: 'NIF' },
    { clave: 'precioManoDeObra', etiqueta: 'Precio mano de obra' },
    { clave: 'iva', etiqueta: 'IVA' },
]

/* Un campo cuenta como vacío si no hay nada... o si es NaN: eso es lo que deja
   un input numérico en blanco con valueAsNumber, y no lo cazaría un ?? porque
   NaN no es null ni undefined. Un 0 SÍ es un valor válido (un IVA del 0 %). */
function estaVacio(valor) {
    if (valor === null || valor === undefined || valor === '') return true
    return typeof valor === 'number' && Number.isNaN(valor)
}

/* Claves de los campos que faltan: ['precioManoDeObra', 'iva'].
   Sirve para señalar en rojo el input correspondiente. */
export function clavesConfigPendientes(config) {
    if (!config) return CAMPOS.map((campo) => campo.clave)
    return CAMPOS
        .filter((campo) => estaVacio(config[campo.clave]))
        .map((campo) => campo.clave)
}

/* Lo mismo, pero con el nombre que se le enseña al usuario:
   ['Precio mano de obra', 'IVA']. Lista vacía = todo bien. */
export function camposConfigPendientes(config) {
    const pendientes = clavesConfigPendientes(config)
    return CAMPOS
        .filter((campo) => pendientes.includes(campo.clave))
        .map((campo) => campo.etiqueta)
}
