// Validaciones de formato (Nivel A: comprueban la "forma", no el dígito de control)

// DNI (12345678Z), NIE (X1234567L) o CIF (B1234567 / B12345678)
// El flag /i permite escribirlo en minúsculas.
const RE_NIF = /^([XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{7}[0-9A-Z])$/i

// Teléfono español: 9 cifras seguidas
const RE_TELEFONO = /^\d{9}$/

// true si el NIF/DNI/CIF tiene un formato válido
export function nifValido(valor) {
  return RE_NIF.test((valor || '').trim())
}

// true si el teléfono son 9 cifras
export function telefonoValido(valor) {
  return RE_TELEFONO.test((valor || '').trim())
}
