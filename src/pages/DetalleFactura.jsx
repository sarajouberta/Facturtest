import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import FacturaPDF from '../components/FacturaPDF'
import { useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'


function DetalleFactura() {
    const { id } = useParams()
    const navigate = useNavigate()

    //añadido para el pdf: hook que crea la "caja" que guarda referencia al elemento del DOM real
    const hojaRef = useRef(null)

    const factura = useLiveQuery(() => db.facturas.get(Number(id)), [id])

    //para mostrar temporalmente el detalle:
    const config = useLiveQuery(() => db.config.get(1))

    if (!factura) return <p>Cargando…</p>

    const eliminar = async () => {
        if (confirm(`¿Eliminar la factura ${factura.numero}?`)) {
            await db.facturas.delete(factura.id)
            navigate('/')
        }
    }

    /*Nota: función para exportar la factura: se genera como imagen, no como pdf con texto.
    en React, las funciones que usan datos del componente (factura, hojaRef...) tienen que estar dentro de la función
    del componente, porque esas variables solo existen ahí dentro. Fuera del componente, esas variables "no existen". Es una cuestión de ámbito (scope): una variable solo es visible
    dentro de las llaves { } donde se declaró. */
    const exportarPDF = async () => {
        //1. Se captura la hoja como imagen:
        const canvas = await html2canvas(hojaRef.current, { scale: 2 })
        const imagen = canvas.toDataURL('image/png')

        //2. Se crea un PDF A4 vertical, centrado en horizontal y pegado arriba:
          const pdf = new jsPDF('p', 'mm', 'a4')
          const anchoPag = pdf.internal.pageSize.getWidth()

          const margen = 10 //margen (mm) a los lados y arriba
          const ratio = canvas.width / canvas.height //identifica orientación (<1: vertical, >1: horizontal)

          const anchoImg = anchoPag - margen * 2 //a lo ancho, dejando margen lateral
          const altoImg = anchoImg / ratio  //alto proporcional (puede sobrar por abajo)

          const x = margen // centrada: mismo margen a izquierda y derecha
          const y = margen // margen superior pequeño (cerca del borde de arriba)
          pdf.addImage(imagen, 'PNG', x, y, anchoImg, altoImg)

        //3. Se genera el archivo
        const nombreArchivo = `${factura.numero}.pdf`
        const blob = pdf.output('blob')
        const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' })

        //4. Se intenta compartir; si no se puede, se descarga:
        if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
            await navigator.share({ files: [archivo], title: nombreArchivo })
        } else {
            pdf.save(nombreArchivo)
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
                    <p className="text-sm text-gray-600">{factura.vehiculo?.matricula}</p>
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
                            <td className="py-1 text-right">{Number(c.precioUnitario).toFixed(2)} €</td>
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
                <button onClick={() => navigate('/')} className="border rounded px-4 py-2">
                    Volver
                </button>
                <button onClick={exportarPDF} className="bg-green-600 text-white rounded px-4 py-2">
                    Exportar PDF
                </button>
                <button onClick={eliminar} className="bg-red-600 text-white rounded px-4 py-2">
                    Eliminar
                </button>
            </div>

            {/* Vista previa de la factura imprimible (temporal) : se conecta aquí al referencia a la hoja (ref)*/}
            <div style={{ marginTop: '32px', width: '760px' }} ref={hojaRef}>
                <FacturaPDF factura={factura} config={config} />
            </div>
        </div>
    )
}

export default DetalleFactura