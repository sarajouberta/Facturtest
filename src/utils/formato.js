// Formatos de presentación: convierten datos guardados en texto para mostrar.

/* El tiempo de mano de obra se GUARDA en centésimas de hora (100 = 1 h), que es
   como lo apunta el taller, pero se MUESTRA en horas con dos decimales (0,80),
   que es el formato estándar del sector (confirmado con facturas de concesionario
   y con el titular del taller).

   Son el mismo dato: 100 → 1,00 · 80 → 0,80 · 50 → 0,50 · 25 → 0,25.
   Con coma decimal, por 'es-ES'. */
export function tiempoEnHoras(tiempo) {
    const horas = (Number(tiempo) || 0) / 100
    return horas.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}
