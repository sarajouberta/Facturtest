import { describe, test, expect } from 'vitest'
import { limpiarConceptos, limpiarLineasManoDeObra, facturaAFormulario } from './lineas'
import { calcularTotalManoDeObra } from './calculos'

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

    // El precio se teclea como texto: con coma no puede perderse por el camino
    test('un precio escrito con coma se guarda como número', () => {
        const [concepto] = limpiarConceptos([
            { descripcion: 'Filtro', cantidad: 2, precioUnitario: '46,50' },
        ])
        expect(concepto.precioUnitario).toBe(46.5)
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
    test('descarta una linea con tarifa pero sin tarea ni horas', () => {
        expect(limpiarLineasManoDeObra([{ descripcion: '', horas: '', precioHora: 20 }]))
            .toEqual([])
    })

    test('conserva una linea con horas', () => {
        const lineas = [{ descripcion: '', horas: '0,80', precioHora: 20 }]
        expect(limpiarLineasManoDeObra(lineas)).toEqual([
            { descripcion: '', horas: 0.8, precioHora: 20 },
        ])
    })

    test('conserva una linea con tarea aunque no lleve horas', () => {
        const lineas = [{ descripcion: 'Revisión', horas: '', precioHora: 20 }]
        expect(limpiarLineasManoDeObra(lineas)).toHaveLength(1)
    })

    test('las horas escritas con coma se guardan como número', () => {
        const [linea] = limpiarLineasManoDeObra([{ descripcion: 'X', horas: '1,50', precioHora: 20 }])
        expect(linea.horas).toBe(1.5)
        expect(typeof linea.horas).toBe('number')
    })

    test('sin lista, devuelve lista vacía', () => {
        expect(limpiarLineasManoDeObra(undefined)).toEqual([])
    })

    /* El total en vivo del formulario se calcula sobre estas líneas ya limpias.
       Si se saltara este paso, un '0,5' llegaría como texto a Number(), daría NaN
       y el total se quedaría a 0 mientras el importe de la línea sí se veía. */
    test('lo que devuelve sirve para calcular: las comas ya son números', () => {
        const [linea] = limpiarLineasManoDeObra([
            { descripcion: 'Diagnosis', horas: '0,5', precioHora: '46,50' },
        ])
        expect(linea.horas * linea.precioHora).toBe(23.25)
    })
})

describe('facturaAFormulario', () => {
    test('los importes guardados como número salen formateados con coma', () => {
        const factura = {
            conceptos: [{ descripcion: 'Filtro', cantidad: 2, precioUnitario: 46.5 }],
            lineasManoDeObra: [{ descripcion: 'Diagnosis', horas: 0.8, precioHora: 46.5 }],
        }
        const formulario = facturaAFormulario(factura)
        expect(formulario.conceptos[0].precioUnitario).toBe('46,50')
        expect(formulario.lineasManoDeObra[0].horas).toBe('0,80')
        expect(formulario.lineasManoDeObra[0].precioHora).toBe('46,50')
    })

    test('la cantidad no se toca: su campo es numérico', () => {
        const factura = { conceptos: [{ descripcion: 'Filtro', cantidad: 2, precioUnitario: 10 }] }
        expect(facturaAFormulario(factura).conceptos[0].cantidad).toBe(2)
    })

    /* Una factura anterior al desglose guardaba solo el importe. Se convierte en
       una línea para poder editarla, y lo que hay que garantizar es que el
       importe no cambie: por eso el test la lleva de vuelta por las funciones de
       guardado y comprueba el total, en vez de mirar los campos por separado. */
    test('una factura antigua conserva su importe de mano de obra', () => {
        const formulario = facturaAFormulario({ manoDeObra: 55 })
        expect(formulario.lineasManoDeObra).toHaveLength(1)
        expect(calcularTotalManoDeObra(limpiarLineasManoDeObra(formulario.lineasManoDeObra)))
            .toBe(55)
    })

    test('una factura antigua sin mano de obra no inventa ninguna línea', () => {
        expect(facturaAFormulario({ manoDeObra: 0 }).lineasManoDeObra).toEqual([])
    })

    /* Si el orden de los casos estuviera al revés, a esta factura se le añadiría
       la línea inventada además de las suyas y el importe se duplicaría. */
    test('una factura nueva no recibe la línea de conversión', () => {
        const factura = {
            manoDeObra: 20,
            lineasManoDeObra: [{ descripcion: 'Cambio de aceite', horas: 1, precioHora: 20 }],
        }
        expect(facturaAFormulario(factura).lineasManoDeObra).toHaveLength(1)
    })

    test('el id no llega al formulario: no es un campo de la factura', () => {
        expect(facturaAFormulario({ id: 'abc123', numero: '46' })).not.toHaveProperty('id')
    })

    test('una factura sin líneas de ningún tipo no rompe', () => {
        const formulario = facturaAFormulario({ numero: '46' })
        expect(formulario.conceptos).toEqual([])
        expect(formulario.lineasManoDeObra).toEqual([])
    })
})
