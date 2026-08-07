import { describe, test, expect } from 'vitest'
import { generarSiguienteNumero, numeroYaUsado } from './numeracion'


describe('generarSiguienteNumero', () => {
  test('sin facturas, arranca en el número inicial configurado', () => {
    expect(generarSiguienteNumero([], 46)).toBe('46')
  })

  test('sin número inicial, arranca en 1', () => {
    expect(generarSiguienteNumero([])).toBe('1')
  })

  test('sigue el correlativo al más alto existente', () => {
    const facturas = [{ numero: '46' }, { numero: '47' }]
    expect(generarSiguienteNumero(facturas, 46)).toBe('48')
  })

  test('el correlativo real manda si supera al inicial', () => {
    const facturas = [{ numero: '50' }]
    expect(generarSiguienteNumero(facturas, 46)).toBe('51')
  })

  test('usa el número más alto, no cuántas facturas hay (huecos)', () => {
    const facturas = [{ numero: '46' }, { numero: '50' }]
    expect(generarSiguienteNumero(facturas, 46)).toBe('51')
  })

  test('ignora números no válidos del formato antiguo', () => {
    const facturas = [{ numero: 'F-2026-009' }, { numero: '46' }]
    expect(generarSiguienteNumero(facturas, 1)).toBe('47')
  })
})

describe('numeroYaUsado', () => {
  const facturas = [{ id: 'a', numero: '46' }, { id: 'b', numero: 47 }]

  test('detecta un número repetido', () => {
    expect(numeroYaUsado(facturas, '46')).toBe(true)
  })

  test('un número libre no está usado', () => {
    expect(numeroYaUsado(facturas, '48')).toBe(false)
  })

  // Los números pueden estar guardados como texto o como número según cuándo
  // se creó la factura: la comparación no puede depender del tipo.
  test('compara igual un número guardado como número que como texto', () => {
    expect(numeroYaUsado(facturas, '47')).toBe(true)
    expect(numeroYaUsado(facturas, 47)).toBe(true)
  })

  test('no le afectan los espacios de sobra', () => {
    expect(numeroYaUsado(facturas, ' 46 ')).toBe(true)
  })

  test('un número vacío no cuenta como repetido (de eso ya avisa "required")', () => {
    expect(numeroYaUsado(facturas, '')).toBe(false)
    expect(numeroYaUsado(facturas, null)).toBe(false)
  })

  test('sin facturas cargadas, no bloquea', () => {
    expect(numeroYaUsado(undefined, '46')).toBe(false)
  })

  test('excluye la propia factura al editarla', () => {
    expect(numeroYaUsado(facturas, '46', 'a')).toBe(false)
    expect(numeroYaUsado(facturas, '46', 'b')).toBe(true)
  })
})
