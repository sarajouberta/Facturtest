import { describe, test, expect } from 'vitest'
import { generarSiguienteNumero } from './numeracion'


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
