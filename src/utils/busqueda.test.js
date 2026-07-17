import { describe, test, expect } from 'vitest'
import { filtrarFacturas, buscarPorMatricula } from './busqueda'

const facturas = [
  { id: 'a', numero: '100', fecha: '2025-03-10', vehiculo: { matricula: 'AAA111' } },
  { id: 'b', numero: '200', fecha: '2026-07-01', vehiculo: { matricula: 'BBB222' } },
  { id: 'c', numero: '300', fecha: '2026-07-20', vehiculo: { matricula: 'CCC333' } },
]

const ids = (r) => r.map((f) => f.id)

describe('filtrarFacturas — texto (solo matrícula)', () => {
  test('sin filtros devuelve todas', () => {
    expect(filtrarFacturas(facturas, {})).toHaveLength(3)
  })

  test('busca por matrícula ignorando espacios, guiones y mayúsculas', () => {
    expect(ids(filtrarFacturas(facturas, { texto: 'aaa 111' }))).toEqual(['a'])
    expect(ids(filtrarFacturas(facturas, { texto: 'BBB-222' }))).toEqual(['b'])
  })

  test('coincidencia parcial de la matrícula', () => {
    expect(ids(filtrarFacturas(facturas, { texto: '222' }))).toEqual(['b'])
  })

  test('NO busca por número de factura (solo matrícula)', () => {
    // '100' es el número de la factura a, pero la caja ya no busca por número
    expect(filtrarFacturas(facturas, { texto: '100' })).toHaveLength(0)
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

describe('buscarPorMatricula (cliente/vehículo recurrente)', () => {
  const datos = [
    { id: 'a', fecha: '2025-01-10', cliente: { nombre: 'Ana' }, vehiculo: { matricula: '1234ABC' } },
    { id: 'b', fecha: '2026-06-01', cliente: { nombre: 'Luis' }, vehiculo: { matricula: '1234ABC' } },
    { id: 'c', fecha: '2026-01-01', cliente: { nombre: 'Marta' }, vehiculo: { matricula: '5678XYZ' } },
  ]

  test('devuelve la factura más reciente de esa matrícula', () => {
    // a y b comparten matrícula; b (2026-06) es más reciente que a (2025-01)
    expect(buscarPorMatricula(datos, '1234 abc').id).toBe('b')
  })

  test('encuentra ignorando espacios, guiones y mayúsculas', () => {
    expect(buscarPorMatricula(datos, '5678-xyz').id).toBe('c')
  })

  test('exige matrícula exacta, no parcial', () => {
    expect(buscarPorMatricula(datos, '1234')).toBeNull()
  })

  test('devuelve null si no hay coincidencia o la matrícula está vacía', () => {
    expect(buscarPorMatricula(datos, 'ZZZ000')).toBeNull()
    expect(buscarPorMatricula(datos, '')).toBeNull()
  })
})
