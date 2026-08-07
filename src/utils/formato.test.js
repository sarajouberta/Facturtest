import { describe, test, expect } from 'vitest'
import { tiempoEnHoras } from './formato'

describe('tiempoEnHoras', () => {
    test('100 centésimas es una hora', () => {
        expect(tiempoEnHoras(100)).toBe('1,00')
    })

    // El caso de la factura de concesionario que sirvió de modelo:
    // 0,80 × 46,50 € = 37,20 €
    test('80 centésimas se imprimen como 0,80', () => {
        expect(tiempoEnHoras(80)).toBe('0,80')
    })

    test('media hora y cuarto de hora', () => {
        expect(tiempoEnHoras(50)).toBe('0,50')
        expect(tiempoEnHoras(25)).toBe('0,25')
    })

    test('más de una hora', () => {
        expect(tiempoEnHoras(150)).toBe('1,50')
        expect(tiempoEnHoras(320)).toBe('3,20')
    })

    test('siempre con dos decimales, aunque sean ceros', () => {
        expect(tiempoEnHoras(200)).toBe('2,00')
    })

    test('usa coma decimal, no punto', () => {
        expect(tiempoEnHoras(80)).toContain(',')
        expect(tiempoEnHoras(80)).not.toContain('.')
    })

    test('sin tiempo, 0,00', () => {
        expect(tiempoEnHoras(0)).toBe('0,00')
        expect(tiempoEnHoras(NaN)).toBe('0,00')
        expect(tiempoEnHoras(undefined)).toBe('0,00')
        expect(tiempoEnHoras('')).toBe('0,00')
    })

    test('acepta el tiempo escrito como texto', () => {
        expect(tiempoEnHoras('80')).toBe('0,80')
    })
})
