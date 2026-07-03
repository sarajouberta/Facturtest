import { useParams, useNavigate } from 'react-router-dom'
  import { useLiveQuery } from 'dexie-react-hooks'
  import { db } from '../db'

  function DetalleFactura() {
    const { id } = useParams()
    const navigate = useNavigate()

    // El id llega como texto en la URL; Dexie lo necesita como número
    const factura = useLiveQuery(() => db.facturas.get(Number(id)), [id])

    if (!factura) return <p>Cargando…</p>

    const eliminar = async () => {
      if (confirm(`¿Eliminar la factura ${factura.numero}?`)) {
        await db.facturas.delete(factura.id)
        navigate('/')
      }
    }
return (
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold mb-1">Factura {factura.numero}</h2>
        <p className="text-sm text-gray-600 mb-4">{factura.fecha}</p>

        <div className="border rounded p-4 mb-4">
          <h3 className="font-semibold mb-1">Cliente</h3>
          <p>{factura.cliente?.nombre}</p>
          <p className="text-sm text-gray-600">{factura.cliente?.nif}</p>
          <p className="text-sm text-gray-600">{factura.cliente?.direccion}</p>
        </div>

        <table className="w-full mb-4 text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Descripción</th>
              <th className="py-1 text-right">Cant.</th>
              <th className="py-1 text-right">Precio</th>
              <th className="py-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {factura.conceptos.map((c, i) => (
              <tr key={i} className="border-b">
                <td className="py-1">{c.descripcion}</td>
                <td className="py-1 text-right">{c.cantidad}</td>
                <td className="py-1 text-right">{c.precioUnitario.toFixed(2)}
  €</td>
  <td className="py-1 text-right">
                  {(c.cantidad * c.precioUnitario).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col items-end gap-1 mb-6">
          <span>Base imponible: {factura.baseImponible.toFixed(2)} €</span>
          <span>
            IVA ({factura.iva}%): {(factura.total -
  factura.baseImponible).toFixed(2)} €
          </span>
          <span className="font-bold text-lg">Total: {factura.total.toFixed(2)}
  €</span>
        </div>

        <div className="flex gap-2">
          <button onClick={() => navigate('/')} className="border rounded px-4
  py-2">
            Volver
          </button>
          <button onClick={eliminar} className="bg-red-600 text-white rounded 
  px-4 py-2">
            Eliminar
          </button>
        </div>
      </div>
    )
  }

  export default DetalleFactura