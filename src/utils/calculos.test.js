import { describe, test, expect } from 'vitest'
import {
    calcularTotalMateriales, calcularBaseImponible, calcularTotal,
    calcularManoDeObra, calcularTotalManoDeObra,
} from './calculos'

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

//el tiempo de mano de obra se representa como 1h = 100:
describe('calcularManoDeObra', () => {
    test('100 = una hora completa a la tarifa', () => {
        expect(calcularManoDeObra(100, 20)).toBe(20)
    })

    test('50 = media hora a la tarifa', () => {
        expect(calcularManoDeObra(50, 20)).toBe(10)
    })

    test('150 = hora y media a la tarifa', () => {
        expect(calcularManoDeObra(150, 20)).toBe(30)
    })

    test('25 = cuarto de hora a la tarifa', () => {
        expect(calcularManoDeObra(25, 20)).toBe(5)
    })

    test('tiempo a 0', () => {
        expect(calcularManoDeObra(0, 20)).toBe(0)
    })

    test('tarifa a 0', () => {
        expect(calcularManoDeObra(100, 0)).toBe(0)
    })

    test('un tiempo sin rellenar (NaN) cuenta como 0', () => {
        expect(calcularManoDeObra(NaN, 20)).toBe(0)
    })
})

describe('calcularTotalManoDeObra', () => {
    test('suma el importe de cada línea', () => {
        const lineas = [
            { tiempo: 100, precioHora: 20 },  // 20
            { tiempo: 50, precioHora: 20 },   // 10
        ]
        expect(calcularTotalManoDeObra(lineas)).toBe(30)
    })

    test('cada línea puede llevar su propia tarifa', () => {
        const lineas = [
            { tiempo: 100, precioHora: 20 },  // 20
            { tiempo: 100, precioHora: 35 },  // 35  (p. ej. trabajo especializado)
        ]
        expect(calcularTotalManoDeObra(lineas)).toBe(55)
    })

    test('devuelve 0 si no hay líneas', () => {
        expect(calcularTotalManoDeObra([])).toBe(0)
    })

    test('devuelve 0 si la lista no existe (factura antigua)', () => {
        expect(calcularTotalManoDeObra(undefined)).toBe(0)
    })

    test('ignora las líneas a medio rellenar', () => {
        const lineas = [
            { tiempo: 100, precioHora: 20 },       // 20
            { descripcion: 'sin tiempo ni tarifa' } // 0
        ]
        expect(calcularTotalManoDeObra(lineas)).toBe(20)
    })

    test('redondea a 2 decimales el total, no cada línea', () => {
        // 33 centésimas a 10 €/h = 3,30 € por línea; tres líneas = 9,90 €
        const lineas = [
            { tiempo: 33, precioHora: 10 },
            { tiempo: 33, precioHora: 10 },
            { tiempo: 33, precioHora: 10 },
        ]
        expect(calcularTotalManoDeObra(lineas)).toBe(9.9)
    })
})