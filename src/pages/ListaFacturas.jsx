//Nota: cambios para cambiar la bdd Firebase
import { Link, Navigate } from 'react-router-dom'
import { useFacturas, useConfig } from '../datos'

function ListaFacturas() {
  //null = cargado pero sin config;  undefined = todavía cargando
  const facturas = useFacturas()
  const config = useConfig()


  // aún cargando datos de la BD
  if (facturas === undefined || config === undefined) return <p>Cargando…</p>

  // no hay datos del taller todavía → llevar a Configuración (onboarding)
  if (config === null) return <Navigate to="/configuracion" replace />


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
      {facturas.length === 0 ? (
        <p className="text-gray-600">No hay facturas todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {facturas.map((f) => (
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