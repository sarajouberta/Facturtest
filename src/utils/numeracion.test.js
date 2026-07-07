import { describe, test, expect } from 'vitest'
  import { generarSiguienteNumero } from './numeracion'

  describe('generarSiguienteNumero', () => {
    test('empieza en 001 si no hay ninguna factura', () => {
      expect(generarSiguienteNumero([], 2026)).toBe('F-2026-001')
    })

    test('devuelve el siguiente al más alto existente', () => {
      const facturas = [
        { numero: 'F-2026-001' },
        { numero: 'F-2026-002' },
      ]
      expect(generarSiguienteNumero(facturas, 2026)).toBe('F-2026-003')
    })

    test('rellena con ceros a la izquierda (9 → 010)', () => {
      const facturas = [{ numero: 'F-2026-009' }]
      expect(generarSiguienteNumero(facturas, 2026)).toBe('F-2026-010')
    })

    test('solo cuenta las facturas del año pedido', () => {
      const facturas = [
        { numero: 'F-2025-007' }, //año distinto, no cuenta
        { numero: 'F-2026-001' },
      ]
      expect(generarSiguienteNumero(facturas, 2026)).toBe('F-2026-002')
    })

    //MUY importante: si se elimina una, no pueden verse afectados los demás números
    test('usa el número más alto, no cuántas facturas hay', () => {
      const facturas = [
        { numero: 'F-2026-001' },
        { numero: 'F-2026-005' }, //hay un hueco (falta 002-004)
      ]
      expect(generarSiguienteNumero(facturas, 2026)).toBe('F-2026-006')
    })
  })
