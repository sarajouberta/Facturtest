import { describe, test, expect } from 'vitest'
import { matriculaParaGuardar, normalizarMatricula } from './matricula'

describe('matriculaParaGuardar', () => {
  test('pone en mayúsculas y quita los espacios', () => {
    expect(matriculaParaGuardar('1234 abc')).toBe('1234ABC')
  })

  test('quita los guiones (formato antiguo)', () => {
    expect(matriculaParaGuardar('M-1234-ab')).toBe('M1234AB')
  })

  test('una matrícula ya limpia se queda igual', () => {
    expect(matriculaParaGuardar('1234ABC')).toBe('1234ABC')
  })

  test('undefined o null → cadena vacía (no revienta)', () => {
    expect(matriculaParaGuardar(undefined)).toBe('')
    expect(matriculaParaGuardar(null)).toBe('')
  })
})

describe('normalizarMatricula (para comparar en la búsqueda)', () => {
  test('pone en minúsculas y quita separadores', () => {
    expect(normalizarMatricula('1234 ABC')).toBe('1234abc')
    expect(normalizarMatricula('1234-abc')).toBe('1234abc')
  })

  test('formas distintas de la misma matrícula coinciden', () => {
    expect(normalizarMatricula('1234 ABC')).toBe(normalizarMatricula('1234-abc'))
  })
})
