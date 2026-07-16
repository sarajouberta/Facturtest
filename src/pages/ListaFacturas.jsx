//Nota: cambios para cambiar la bdd Firebase
import { Link, Navigate } from 'react-router-dom'
import { useFacturas, useConfig } from '../datos'

function ListaFacturas() {
  //useLiveQuery lee las facturas y se re-ejecuta solo cuando cambian en la BD
  //const facturas = useLiveQuery(() => db.facturas.toArray())

  //null = cargado pero sin config;  undefined = todavía cargando
  //const config = useLiveQuery(() => db.config.get(1).then((c) => c ?? null))

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
entras en /factura/3, useParams() te da { id: "3" }. Es la forma de saber qué
factura mostrar.
- db.facturas.get(Number(id)):  trae una factura por su clave. Ojo con
Number(id): la URL siempre da texto ("3"), pero el id en Dexie es número (3),
así que hay que convertirlo o no encontraría nada.
- El segundo argumento [id] en useLiveQuery: le dice "vuelve a consultar si
cambia el id". Es como las dependencias de useEffect.
- db.facturas.delete(...): borra el registro. confirm(...) muestra el diálogo
nativo de "¿seguro?" antes de eliminar.
- Link to={\/factura/${f.id}`}`: genera el enlace a la factura concreta,
metiendo su id en la URL */