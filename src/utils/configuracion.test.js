import { describe, test, expect } from 'vitest'
import { camposConfigPendientes, clavesConfigPendientes } from './configuracion'

const COMPLETA = {
    nombre: 'Taller Asturtest',
    nif: 'B12345678',
    precioManoDeObra: 20,
    iva: 21,
}

describe('camposConfigPendientes', () => {
    test('no falta nada si la configuración está completa', () => {
        expect(camposConfigPendientes(COMPLETA)).toEqual([])
    })

    test('detecta un campo que nunca se guardó (config antigua)', () => {
        // Se desestructura para QUITAR la clave; la variable no se usa, de ahí el _
        const { precioManoDeObra: _tarifa, ...sinTarifa } = COMPLETA
        expect(camposConfigPendientes(sinTarifa)).toEqual(['Precio mano de obra'])
    })

    test('detecta varios campos a la vez', () => {
        const { precioManoDeObra: _t, iva: _i, ...vieja } = COMPLETA
        expect(camposConfigPendientes(vieja)).toEqual(['Precio mano de obra', 'IVA'])
    })

    test('un campo numérico dejado en blanco (NaN) cuenta como pendiente', () => {
        expect(camposConfigPendientes({ ...COMPLETA, precioManoDeObra: NaN }))
            .toEqual(['Precio mano de obra'])
    })

    test('una cadena vacía cuenta como pendiente', () => {
        expect(camposConfigPendientes({ ...COMPLETA, nombre: '' }))
            .toEqual(['Nombre comercial'])
    })

    test('un 0 es un valor válido, no un hueco (IVA del 0 %)', () => {
        expect(camposConfigPendientes({ ...COMPLETA, iva: 0 })).toEqual([])
    })

    /* Pero una tarifa de 0 €/hora no significa nada: es un hueco. Pasa al vaciar
       el campo, porque convertir '' a número da 0. */
    test('una tarifa a 0 sí cuenta como pendiente', () => {
        expect(camposConfigPendientes({ ...COMPLETA, precioManoDeObra: 0 }))
            .toEqual(['Precio mano de obra'])
    })

    test('una tarifa borrada (null) cuenta como pendiente', () => {
        expect(camposConfigPendientes({ ...COMPLETA, precioManoDeObra: null }))
            .toEqual(['Precio mano de obra'])
    })

    test('sin configuración, faltan todos', () => {
        expect(camposConfigPendientes(null)).toEqual([
            'Nombre comercial', 'NIF', 'Precio mano de obra', 'IVA',
        ])
    })
})

describe('clavesConfigPendientes', () => {
    test('devuelve la clave del campo, no su etiqueta', () => {
        expect(clavesConfigPendientes({ ...COMPLETA, precioManoDeObra: NaN }))
            .toEqual(['precioManoDeObra'])
    })

    test('no falta nada si la configuración está completa', () => {
        expect(clavesConfigPendientes(COMPLETA)).toEqual([])
    })

    // Las dos funciones deben coincidir siempre: una señala el input y la otra
    // escribe el aviso, y sería confuso que discreparan.
    test('devuelve tantas claves como etiquetas', () => {
        const config = { ...COMPLETA, nombre: '', iva: NaN }
        expect(clavesConfigPendientes(config)).toHaveLength(
            camposConfigPendientes(config).length,
        )
    })
})
