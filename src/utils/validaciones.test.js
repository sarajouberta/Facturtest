import { describe, test, expect } from 'vitest'
import { nifValido, telefonoValido } from './validaciones'

describe('nifValido', () => {
  test('acepta un DNI (8 cifras + letra)', () => {
    expect(nifValido('12345678Z')).toBe(true)
  })

  test('acepta un NIE (X/Y/Z + 7 cifras + letra)', () => {
    expect(nifValido('X1234567L')).toBe(true)
  })

  test('acepta un CIF (letra + 7 cifras + control)', () => {
    expect(nifValido('B12345678')).toBe(true)
  })

  test('acepta minúsculas', () => {
    expect(nifValido('12345678z')).toBe(true)
  })

  test('ignora los espacios de alrededor', () => {
    expect(nifValido('  12345678Z  ')).toBe(true)
  })

  test('rechaza un número demasiado corto', () => {
    expect(nifValido('123')).toBe(false)
  })

  test('rechaza texto sin formato de NIF', () => {
    expect(nifValido('hola')).toBe(false)
  })

  test('rechaza un DNI sin letra', () => {
    expect(nifValido('12345678')).toBe(false)
  })

  test('rechaza un valor vacío', () => {
    expect(nifValido('')).toBe(false)
  })
})

describe('telefonoValido', () => {
  test('acepta 9 cifras', () => {
    expect(telefonoValido('612345678')).toBe(true)
  })

  test('ignora los espacios de alrededor', () => {
    expect(telefonoValido('  612345678  ')).toBe(true)
  })

  test('rechaza menos de 9 cifras', () => {
    expect(telefonoValido('12345')).toBe(false)
  })

  test('rechaza más de 9 cifras', () => {
    expect(telefonoValido('6123456789')).toBe(false)
  })

  test('rechaza letras', () => {
    expect(telefonoValido('61234567a')).toBe(false)
  })

  test('rechaza un valor vacío', () => {
    expect(telefonoValido('')).toBe(false)
  })
})
