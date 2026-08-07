import { describe, test, expect } from 'vitest'
import { limpiarConceptos, limpiarLineasManoDeObra } from './lineas'

describe('limpiarConceptos', () => {
    test('descarta la línea intacta que trae el formulario', () => {
        // Así arranca "Nueva factura": una línea con cantidad 1 y nada más
        expect(limpiarConceptos([{ descripcion: '', cantidad: 1, precioUnitario: '' }]))
            .toEqual([])
    })

    test('conserva una línea con descripción aunque no tenga precio', () => {
        const conceptos = [{ descripcion: 'Filtro de aceite', cantidad: 1, precioUnitario: '' }]
        expect(limpiarConceptos(conceptos)).toEqual([
            { descripcion: 'Filtro de aceite', cantidad: 1, precioUnitario: 0 },
        ])
    })

    test('conserva una línea con precio aunque no tenga descripción', () => {
        const conceptos = [{ descripcion: '', cantidad: 2, precioUnitario: 15 }]
        expect(limpiarConceptos(conceptos)).toHaveLength(1)
    })

    test('convierte a número los campos vacíos (NaN de valueAsNumber)', () => {
        const conceptos = [{ descripcion: 'Tornillos', cantidad: NaN, precioUnitario: NaN }]
        expect(limpiarConceptos(conceptos)).toEqual([
            { descripcion: 'Tornillos', cantidad: 0, precioUnitario: 0 },
        ])
    })

    test('recorta los espacios de la descripción', () => {
        expect(limpiarConceptos([{ descripcion: '  Aceite  ', precioUnitario: 5 }])[0].descripcion)
            .toBe('Aceite')
    })

    test('una descripción de solo espacios no salva la línea', () => {
        expect(limpiarConceptos([{ descripcion: '   ', cantidad: 1, precioUnitario: 0 }]))
            .toEqual([])
    })

    test('mezcla: se queda solo con las que valen', () => {
        const conceptos = [
            { descripcion: 'Aceite', cantidad: 1, precioUnitario: 30 },
            { descripcion: '', cantidad: 1, precioUnitario: '' },
            { descripcion: 'Filtro', cantidad: 1, precioUnitario: 12 },
        ]
        expect(limpiarConceptos(conceptos)).toHaveLength(2)
    })

    test('sin lista, devuelve lista vacía', () => {
        expect(limpiarConceptos(undefined)).toEqual([])
    })
})

describe('limpiarLineasManoDeObra', () => {
    /* Ojo: la tarifa NO sirve para decidir si la línea está vacía. Al añadirla ya
       viene rellena desde la configuración, así que una línea sin tocar tiene
       precioHora pero no es una línea de verdad. */
    test('descarta una línea con tarifa pero sin tarea ni tiempo', () => {
        expect(limpiarLineasManoDeObra([{ descripcion: '', tiempo: '', precioHora: 20 }]))
            .toEqual([])
    })

    test('conserva una línea con tiempo', () => {
        const lineas = [{ descripcion: '', tiempo: '100', precioHora: 20 }]
        expect(limpiarLineasManoDeObra(lineas)).toEqual([
            { descripcion: '', tiempo: 100, precioHora: 20 },
        ])
    })

    test('conserva una línea con tarea aunque no lleve tiempo', () => {
        const lineas = [{ descripcion: 'Revisión', tiempo: '', precioHora: 20 }]
        expect(limpiarLineasManoDeObra(lineas)).toHaveLength(1)
    })

    test('el tiempo escrito como texto se guarda como número', () => {
        const [linea] = limpiarLineasManoDeObra([{ descripcion: 'X', tiempo: '150', precioHora: 20 }])
        expect(linea.tiempo).toBe(150)
        expect(typeof linea.tiempo).toBe('number')
    })

    test('sin lista, devuelve lista vacía', () => {
        expect(limpiarLineasManoDeObra(undefined)).toEqual([])
    })
})
