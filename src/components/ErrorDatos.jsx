/* Aviso de "no se han podido cargar los datos".
   Existe porque un fallo de lectura dejaba la pantalla en "Cargando…" para
   siempre: el error solo se escribía en la consola, que en un móvil no está a
   mano. Aquí se ve el motivo y, sobre todo, hay una forma de reintentar — antes
   la única salida era cerrar y volver a abrir la app. */
function ErrorDatos({ error, children }) {
    return (
        <div role="alert"
            className="bg-red-50 text-red-900 border border-red-200 rounded p-4 flex flex-col gap-2 items-start">
            <p className="font-medium">{children || 'No se han podido cargar los datos.'}</p>
            <p className="text-sm">
                Revisa la conexión e inténtalo de nuevo.
                {error?.message && <> Detalle: {error.message}</>}
            </p>
            <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white rounded px-4 py-2 font-medium"
            >
                Reintentar
            </button>
        </div>
    )
}

export default ErrorDatos
