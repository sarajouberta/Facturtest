import { useParams, useNavigate } from 'react-router-dom'
  import { useLiveQuery } from 'dexie-react-hooks'
  import { db } from '../db'

  function DetalleFactura() {
    const { id } = useParams()
    const navigate = useNavigate()

    const factura = useLiveQuery(() => db.facturas.get(Number(id)), [id])

    if (!factura) return <p>Cargando…</p>

    const eliminar = async () => {
      if (confirm(`¿Eliminar la factura ${factura.numero}?`)) {
        await db.facturas.delete(factura.id)
        navigate('/')
      }
    }

/*importes con valor por defecto 0 (por si hay facturas antiguas sin estos 
  campos)
  nota: factura.totalMateriales ?? 0: el ?? (operador de fusión de nulos) significa
  "usa totalMateriales, pero si es null o undefined, usa 0". Se pone porque las
  facturas creadas antes de ampliar el modelo no tienen estos campos, y sin
  esta defensa .toFixed(2) daría error (buena costumbre al evolucionar un
  modelo de datos) */
    const totalMateriales = factura.totalMateriales ?? 0
    const manoDeObra = factura.manoDeObra ?? 0
    const baseImponible = factura.baseImponible ?? 0
    const total = factura.total ?? 0

    return (
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold mb-1">Factura {factura.numero}</h2>
        <p className="text-sm text-gray-600 mb-4">{factura.fecha}</p>

        {/* Cliente y vehículo */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-1">Cliente</h3>
            <p>{factura.cliente?.nombre}</p>
            <p className="text-sm text-gray-600">{factura.cliente?.nif}</p>
            <p className="text-sm text-gray-600">{factura.cliente?.direccion}</p>
            <p className="text-sm text-gray-600">
              {factura.cliente?.localidad} {factura.cliente?.provincia}
            </p>
            <p className="text-sm text-gray-600">{factura.cliente?.telefono}</p>
          </div>

          <div className="border rounded p-4">
            <h3 className="font-semibold mb-1">Vehículo</h3>
            <p>{factura.vehiculo?.modelo}</p>
            <p className="text-sm text-gray-600">{factura.vehiculo?.vehiculo}</p>
            <p className="text-sm 
  text-gray-600">{factura.vehiculo?.matricula}</p>
            <p className="text-sm text-gray-600">{factura.vehiculo?.km} km</p>
          </div>
        </div>
 {/* Trabajos realizados */}
        {factura.trabajos && (
          <div className="border rounded p-4 mb-4">
            <h3 className="font-semibold mb-1">Trabajos realizados</h3>
            <p className="text-sm whitespace-pre-line">{factura.trabajos}</p>
          </div>
        )}

        {/* Materiales */}
        <table className="w-full mb-4 text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Descripción</th>
              <th className="py-1 text-right">Cant.</th>
              <th className="py-1 text-right">Precio</th>
              <th className="py-1 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {factura.conceptos?.map((c, i) => (
              <tr key={i} className="border-b">
                <td className="py-1">{c.descripcion}</td>
                <td className="py-1 text-right">{c.cantidad}</td>
                <td className="py-1 
  text-right">{Number(c.precioUnitario).toFixed(2)} €</td>
                <td className="py-1 text-right">
                  {(Number(c.cantidad) * Number(c.precioUnitario)).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
{/* Totales */}
        <div className="flex flex-col items-end gap-1 mb-6">
          <span>Total materiales: {totalMateriales.toFixed(2)} €</span>
          <span>Mano de obra: {manoDeObra.toFixed(2)} €</span>
          <span>Base imponible: {baseImponible.toFixed(2)} €</span>
          <span>IVA ({factura.iva}%): {(total - baseImponible).toFixed(2)}
  €</span>
          <span className="font-bold text-lg">Total: {total.toFixed(2)} €</span>
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