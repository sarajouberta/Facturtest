// Comprobación de que la configuración del taller está completa.
//
// Por qué existe esto y no son simplemente campos obligatorios del formulario:
// la configuración envejece. Cuando se añade un campo nuevo (el precio de mano de
// obra, el IVA…), las configuraciones ya guardadas se quedan sin él y nadie avisa.
// El onboarding no lo cubre, porque solo salta cuando NO hay configuración.
// Bloquear el guardado castigaría al usuario por un cambio nuestro, así que la app
// avisa pero no impide seguir.

/* Campos que la app necesita, con el nombre que se le enseña al usuario.
   ceroEsVacio: un 0 en ese campo no es un valor, es un hueco. Una tarifa de
   0 €/hora no significa nada; en cambio un IVA del 0 % sí es legítimo. */
const CAMPOS = [
    { clave: 'nombre', etiqueta: 'Nombre comercial' },
    { clave: 'nif', etiqueta: 'NIF' },
    { clave: 'precioManoDeObra', etiqueta: 'Precio mano de obra', ceroEsVacio: true },
    { clave: 'iva', etiqueta: 'IVA' },
]

/* Un campo cuenta como vacío si no hay nada... o si es NaN: eso es lo que deja
   un input numérico en blanco con valueAsNumber, y no lo cazaría un ?? porque
   NaN no es null ni undefined. */
function estaVacio(valor, ceroEsVacio = false) {
    if (valor === null || valor === undefined || valor === '') return true
    if (typeof valor === 'number') {
        if (Number.isNaN(valor)) return true
        if (ceroEsVacio && valor === 0) return true
    }
    return false
}

/* Claves de los campos que faltan: ['precioManoDeObra', 'iva'].
   Sirve para señalar en rojo el input correspondiente. */
export function clavesConfigPendientes(config) {
    if (!config) return CAMPOS.map((campo) => campo.clave)
    return CAMPOS
        .filter((campo) => estaVacio(config[campo.clave], campo.ceroEsVacio))
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
