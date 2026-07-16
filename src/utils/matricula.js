// Normalización de matrículas.
// Quita todo lo que no sea letra o número (espacios, guiones…) para que
// "1234 ABC", "1234-abc" y "1234ABC" se consideren la misma matrícula.
// Es agnóstico al formato: vale para las nuevas (1234 BCD) y las antiguas
// (M-1234-AB), porque no valida el patrón, solo limpia separadores.
const soloAlfanumerico = (s) => (s ?? '').replace(/[^a-zA-Z0-9]/g, '')

// Para guardar y mostrar en la factura: MAYÚSCULAS y pegada → "1234ABC"
export const matriculaParaGuardar = (s) => soloAlfanumerico(s).toUpperCase()

// Para comparar en la búsqueda: minúsculas y pegada → "1234abc"
export const normalizarMatricula = (s) => soloAlfanumerico(s).toLowerCase()
