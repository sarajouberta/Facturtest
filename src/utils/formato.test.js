import { describe, test, expect } from 'vitest'
import { formatearHoras, formatearDecimal, numeroDesdeTexto } from './formato'

describe('formatearDecimal', () => {
    test('dos decimales y coma', () => {
        expect(formatearDecimal(46.5)).toBe('46,50')
        expect(formatearDecimal(20)).toBe('20,00')
    })

    /* Ida y vuelta: lo que se guarda se puede volver a pintar en el campo y, al
       leerlo otra vez, sale el mismo número. Es lo que permite que la tarifa se
       vea '46,50' al reabrir Configuración y siga valiendo 46.5 al guardar. */
    test('lo formateado se vuelve a leer igual', () => {
        expect(numeroDesdeTexto(formatearDecimal(46.5))).toBe(46.5)
    })
})

describe('formatearHoras', () => {
    // El caso de la factura de concesionario que sirvió de modelo:
    // 0,80 × 46,50 € = 37,20 €
    test('escribe las horas con dos decimales y coma', () => {
        expect(formatearHoras(0.8)).toBe('0,80')
        expect(formatearHoras(0.5)).toBe('0,50')
        expect(formatearHoras(0.25)).toBe('0,25')
    })

    test('siempre dos decimales, aunque sean ceros', () => {
        expect(formatearHoras(1)).toBe('1,00')
        expect(formatearHoras(2)).toBe('2,00')
    })

    test('más de una hora', () => {
        expect(formatearHoras(1.5)).toBe('1,50')
        expect(formatearHoras(3.2)).toBe('3,20')
    })

    test('usa coma decimal, no punto', () => {
        expect(formatearHoras(0.8)).toContain(',')
        expect(formatearHoras(0.8)).not.toContain('.')
    })

    test('sin horas, 0,00', () => {
        expect(formatearHoras(0)).toBe('0,00')
        expect(formatearHoras(NaN)).toBe('0,00')
        expect(formatearHoras(undefined)).toBe('0,00')
        expect(formatearHoras('')).toBe('0,00')
    })
})

describe('numeroDesdeTexto', () => {
    // Lo importante: Number('0,8') es NaN, porque JS solo entiende el punto
    test('entiende la coma decimal española', () => {
        expect(numeroDesdeTexto('0,8')).toBe(0.8)
        expect(numeroDesdeTexto('1,25')).toBe(1.25)
    })

    test('entiende también el punto', () => {
        expect(numeroDesdeTexto('0.8')).toBe(0.8)
    })

    test('enteros', () => {
        expect(numeroDesdeTexto('2')).toBe(2)
    })

    test('ignora los espacios de sobra', () => {
        expect(numeroDesdeTexto('  1,5  ')).toBe(1.5)
    })

    test('lo que no es un número vale 0', () => {
        expect(numeroDesdeTexto('')).toBe(0)
        expect(numeroDesdeTexto('hola')).toBe(0)
        expect(numeroDesdeTexto(null)).toBe(0)
        expect(numeroDesdeTexto(undefined)).toBe(0)
        expect(numeroDesdeTexto(NaN)).toBe(0)
    })

    test('un número ya numérico pasa tal cual', () => {
        expect(numeroDesdeTexto(0.8)).toBe(0.8)
    })
})
