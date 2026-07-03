  import { useLiveQuery } from 'dexie-react-hooks'
  import { Link } from 'react-router-dom'
  import { db } from '../db'

  function ListaFacturas() {
    // useLiveQuery lee las facturas y se re-ejecuta solo cuando cambian en la BD
    const facturas = useLiveQuery(() => db.facturas.toArray())

    // Mientras carga (primer render), facturas es undefined
    if (!facturas) return <p>Cargando…</p>

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
              <li
                key={f.id}
                className="border rounded p-3 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{f.numero}</div>
                  <div className="text-sm text-gray-600">
                    {f.cliente?.nombre} · {f.fecha}
                  </div>
                </div>
                <div className="font-bold">{f.total.toFixed(2)} €</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  export default ListaFacturas