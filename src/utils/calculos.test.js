import { describe, test, expect } from 'vitest'
import { calcularTotalMateriales, calcularBaseImponible, calcularTotal } from './calculos'

/*Nota: como clase de tests en JUNIT. (class CalculosTests) */
describe('calcularTotalMateriales', () => {

    //test: cada caso concreto
    test('suma cantidad × precio de cada material', () => {
        //arrange: preparamos los datos de entrada
        const conceptos = [
            { cantidad: 2, precioUnitario: 10 }, // 20
            { cantidad: 1, precioUnitario: 5 },  // 5
        ]

        //act: ejecutamos la función
        const resultado = calcularTotalMateriales(conceptos)

        //assert: comprobamos el resultado esperado
        expect(resultado).toBe(25)
    })

    test('redondea a 2 decimales (3 × 0,10 € = 0,30 €)', () => {
      const conceptos = [{ cantidad: 3, precioUnitario: 0.1 }]
      expect(calcularTotalMateriales(conceptos)).toBe(0.30)
    })

    test('devuelve 0 si no hay materiales', () => {
        expect(calcularTotalMateriales([])).toBe(0)
    })

    describe('calcularBaseImponible', () => {
        test('suma el total de materiales y la mano de obra', () => {
            expect(calcularBaseImponible(100, 50)).toBe(150)
        })

        test('trata la mano de obra vacía como 0', () => {
            expect(calcularBaseImponible(100, '')).toBe(100)
        })
    })

    describe('calcularTotal', () => {
        test('aplica el 21% de IVA sobre la base', () => {
            expect(calcularTotal(100, 21)).toBe(121)
        })

        test('con IVA 0 el total es igual a la base', () => {
            expect(calcularTotal(100, 0)).toBe(100)
        })
    })

})
