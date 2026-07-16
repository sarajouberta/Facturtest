import { describe, test, expect } from 'vitest'
import { filtrarFacturas } from './busqueda'

const facturas = [
  { id: 'a', numero: '100', fecha: '2025-03-10', vehiculo: { matricula: 'AAA111' } },
  { id: 'b', numero: '200', fecha: '2026-07-01', vehiculo: { matricula: 'BBB222' } },
  { id: 'c', numero: '300', fecha: '2026-07-20', vehiculo: { matricula: 'CCC333' } },
]

const ids = (r) => r.map((f) => f.id)

describe('filtrarFacturas — texto (nº de factura o matrícula)', () => {
  test('sin filtros devuelve todas', () => {
    expect(filtrarFacturas(facturas, {})).toHaveLength(3)
  })

  test('busca por número de factura', () => {
    expect(ids(filtrarFacturas(facturas, { texto: '200' }))).toEqual(['b'])
  })

  test('busca por matrícula ignorando espacios, guiones y mayúsculas', () => {
    expect(ids(filtrarFacturas(facturas, { texto: 'aaa 111' }))).toEqual(['a'])
    expect(ids(filtrarFacturas(facturas, { texto: 'BBB-222' }))).toEqual(['b'])
  })

  test('un dígito corto puede coincidir con varias facturas: es esperado, no un fallo', () => {
    // "1" coincide con el número '1' de x y con la matrícula 'AAA111' de y.
    const datos = [
      { id: 'x', numero: '1', fecha: '2026-01-01', vehiculo: { matricula: 'AAA000' } },
      { id: 'y', numero: '2', fecha: '2026-01-01', vehiculo: { matricula: 'AAA111' } },
    ]
    expect(ids(filtrarFacturas(datos, { texto: '1' }))).toEqual(['x', 'y'])
  })
})

describe('filtrarFacturas — fecha (año / mes)', () => {
  test('filtra por año', () => {
    expect(ids(filtrarFacturas(facturas, { anio: '2026' }))).toEqual(['b', 'c'])
  })

  test('filtra por mes', () => {
    expect(ids(filtrarFacturas(facturas, { mes: '07' }))).toEqual(['b', 'c'])
  })

  test('año y mes que no coinciden con ninguna → vacío', () => {
    expect(filtrarFacturas(facturas, { anio: '2025', mes: '07' })).toHaveLength(0)
  })
})

describe('filtrarFacturas — combinación (texto Y fecha)', () => {
  test('texto y fecha se combinan con Y', () => {
    expect(ids(filtrarFacturas(facturas, { texto: 'ccc', anio: '2026', mes: '07' }))).toEqual(['c'])
  })
})
