import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useFacturas, useConfig } from '../datos'
import { filtrarFacturas } from '../utils/busqueda'

// Meses para el desplegable: [valor que se compara, nombre que se muestra].
// El valor ('01'…'12') coincide con lo que hay en la fecha "AAAA-MM-DD".
const MESES = [
  ['01', 'Enero'], ['02', 'Febrero'], ['03', 'Marzo'], ['04', 'Abril'],
  ['05', 'Mayo'], ['06', 'Junio'], ['07', 'Julio'], ['08', 'Agosto'],
  ['09', 'Septiembre'], ['10', 'Octubre'], ['11', 'Noviembre'], ['12', 'Diciembre'],
]

function ListaFacturas() {
  //null = cargado pero sin config;  undefined = todavía cargando
  const facturas = useFacturas()
  const config = useConfig()
  const [texto, setTexto] = useState('')
  const [anio, setAnio] = useState('')
  const [mes, setMes] = useState('')


  // aún cargando datos de la BD
  if (facturas === undefined || config === undefined) return <p>Cargando…</p>

  // no hay datos del taller todavía → llevar a Configuración (onboarding)
  if (config === null) return <Navigate to="/configuracion" replace />

  // Años presentes en las facturas, para rellenar el desplegable (sin repetir,
  // de más nuevo a más antiguo). new Set() quita duplicados.
  const anios = [...new Set(facturas.map((f) => (f.fecha ?? '').slice(0, 4)).filter(Boolean))]
    .sort()
    .reverse()

  const facturasFiltradas = filtrarFacturas(facturas, { texto, anio, mes })

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Facturas</h2>
        <Link
          to="/nueva-factura"
          className="bg-blue-600 text-white rounded px-4 py-2 font-medium"
        >
          + Nueva
        </Link>
      </div>

      {facturas.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nº de factura o matrícula (p. ej. 1234 ABC)"
            className="w-full border rounded px-3 py-2"
          />
          <div className="flex gap-2">
            <select
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className="border rounded px-3 py-2 flex-1"
            >
              <option value="">Año: todos</option>
              {anios.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="border rounded px-3 py-2 flex-1"
            >
              <option value="">Mes: todos</option>
              {MESES.map(([valor, nombre]) => (
                <option key={valor} value={valor}>{nombre}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {facturas.length === 0 ? (
        <p className="text-gray-600">No hay facturas todavía.</p>
      ) : facturasFiltradas.length === 0 ? (
        <p className="text-gray-600">Ninguna factura coincide con el filtro.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {facturasFiltradas.map((f) => (
            <li key={f.id}>
              <Link
                to={`/factura/${f.id}`}
                className="border rounded p-3 flex justify-between items-center hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium">{f.numero}</div>
                  <div className="text-sm text-gray-600">
                    {f.cliente?.nombre} · {f.fecha}
                  </div>
                </div>
                <div className="font-bold">{f.total.toFixed(2)} €</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ListaFacturas




/* Notas sobre algunos cambios:
- useParams(): lee los parámetros de la URL. Como la ruta es /factura/:id, si
entras en /factura/abc123, useParams() te da { id: "abc123" }. Es la forma de
saber qué factura mostrar.
- En Firestore el id de cada factura es TEXTO (lo genera addDoc), así que se usa
tal cual con useFactura(id), sin convertir a número (con Dexie sí había que
hacer Number(id) porque allí el id era numérico).
- Los datos se leen con hooks que se repintan solos (useFacturas, useFactura,
useConfig): por dentro escuchan Firestore con onSnapshot y refrescan la vista
sola cuando algo cambia, como hacía useLiveQuery con Dexie.
- Borrar: borrarFactura(id) (deleteDoc). confirm(...) muestra el diálogo nativo
de "¿seguro?" antes de eliminar.
- Link to={`/factura/${f.id}`}: genera el enlace a la factura concreta,
metiendo su id en la URL. */
