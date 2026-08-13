import { useParams, useNavigate } from 'react-router-dom'
import { useFactura, useConfig, borrarFactura } from '../datos'

import FacturaPDF from '../components/FacturaPDF'
import { calcularManoDeObra } from '../utils/calculos'
import { formatearHoras } from '../utils/formato'
import { useRef, useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'


function DetalleFactura() {
    const { id } = useParams()
    const navigate = useNavigate()

    //añadido para el pdf: hook que crea la "caja" que guarda referencia al elemento del DOM real
    const hojaRef = useRef(null)

    /* Generar el PDF tarda: en un móvil modesto, varios segundos. Sin señal de que
       está trabajando, el botón parece muerto y se vuelve a pulsar. */
    const [exportando, setExportando] = useState(false)

    const factura = useFactura(id)

    const config = useConfig()

    if (!factura) return <p>Cargando…</p>

    const eliminar = async () => {
        if (confirm(`¿Eliminar la factura ${factura.numero}?`)) {
            try {
                await borrarFactura(factura.id)
                navigate('/')
            } catch (error) {
                console.error('❌ Error al eliminar la factura:', error)
                alert('No se pudo eliminar la factura. Revisa la conexión e inténtalo de nuevo.')
            }
        }
    }

    /*Nota: función para exportar la factura: se genera como imagen, no como pdf con texto.
    en React, las funciones que usan datos del componente (factura, hojaRef...) tienen que estar dentro de la función
    del componente, porque esas variables solo existen ahí dentro. Fuera del componente, esas variables "no existen". Es una cuestión de ámbito (scope): una variable solo es visible
    dentro de las llaves { } donde se declaró. */
    const exportarPDF = async () => {
        if (exportando) return          // evita lanzar dos capturas a la vez
        setExportando(true)
        try {
            /* 0. Esperar a que las imágenes de la hoja estén cargadas. html2canvas
               dibuja lo que hay en ese instante: una imagen a medio cargar sale en
               blanco, sin dar ningún error. */
            await Promise.all(
                [...hojaRef.current.querySelectorAll('img')].map((img) => (
                    img.complete
                        ? Promise.resolve()
                        : new Promise((listo) => {
                            img.onload = listo
                            img.onerror = listo   // si falla, seguimos: mejor sin logo que sin factura
                        })
                )),
            )

            //1. Se captura la hoja como imagen:
            const canvas = await html2canvas(hojaRef.current, { scale: 2 })
            const imagen = canvas.toDataURL('image/png')

            /* Si el lienzo supera el límite del dispositivo, toDataURL NO lanza
               error: devuelve 'data:,' o una cadena vacía. Sin esta comprobación
               el fallo seguiría siendo invisible, que es justo lo que estamos
               persiguiendo. */
            if (!imagen || imagen.length < 100) {
                throw new Error(
                    `La captura salió vacía (${canvas.width}×${canvas.height} px). ` +
                    'Probablemente el móvil no admite una imagen tan grande.',
                )
            }

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

            /* 4. Se intenta compartir; si no se puede, se descarga.
               Los avisos son deliberadamente explícitos: esto se está depurando en
               un móvil ajeno (Samsung Internet), donde no hay consola que mirar, y
               el alert es el único canal para saber por dónde ha ido. */
            /* Descargar. El aviso es opcional a propósito: en un escritorio no
               poder compartir es lo NORMAL (navigator.share es cosa de móviles),
               así que ahí se descarga en silencio, como siempre. El aviso se
               reserva para cuando compartir existía y falló, que es lo que
               estamos persiguiendo en el móvil. */
            const descargar = (motivo) => {
                pdf.save(nombreArchivo)
                if (motivo) {
                    alert(`${motivo}\n\nEl PDF se ha descargado como "${nombreArchivo}".`)
                }
            }

            if (navigator.canShare?.({ files: [archivo] })) {
                try {
                    await navigator.share({ files: [archivo], title: nombreArchivo })
                } catch (errorCompartir) {
                    /* Compartir exige que la llamada ocurra poco después de la
                       pulsación. Generar la imagen y el PDF puede tardar varios
                       segundos en un móvil modesto y, para entonces, el navegador
                       da por consumido el gesto y rechaza con NotAllowedError.
                       AbortError = el usuario cerró el menú a propósito: no molestamos. */
                    if (errorCompartir.name === 'AbortError') return
                    console.error('❌ No se pudo compartir, se descarga:', errorCompartir)
                    descargar(
                        'No se pudo abrir el menú de compartir ' +
                        `(${errorCompartir.name}: ${errorCompartir.message}).`,
                    )
                }
            } else if (navigator.canShare) {
                // La API existe pero rechaza este archivo: eso sí es raro y conviene decirlo
                descargar('Este navegador no admite compartir este tipo de archivo.')
            } else {
                descargar()   // escritorio: se descarga sin molestar
            }
        } catch (error) {
            /* Sin esto, cualquier fallo (memoria al capturar, un CSS que
               html2canvas no digiera…) dejaba el botón mudo: la promesa se
               rechazaba y no pasaba nada en pantalla. El detalle técnico va en el
               propio aviso porque en el móvil no hay consola donde leerlo. */
            console.error('❌ Error al exportar el PDF:', error)
            alert(
                'No se pudo generar el PDF.\n\n' +
                `Detalle: ${error?.name || 'Error'} — ${error?.message || 'sin mensaje'}`,
            )
        } finally {
            setExportando(false)
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

            {/* Materiales. Solo si hay: una factura de solo mano de obra es válida,
                y en ella esta tabla saldría como una cabecera suelta. */}
            {factura.conceptos?.length > 0 && (
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
                        {factura.conceptos.map((c, i) => (
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
            )}

            {/* Mano de obra desglosada (solo facturas nuevas) */}
            {factura.lineasManoDeObra?.length > 0 && (
                <table className="w-full mb-4 text-sm">
                    <thead>
                        <tr className="border-b text-left">
                            <th className="py-1">Mano de obra</th>
                            <th className="py-1 text-right">Cantidad</th>
                            <th className="py-1 text-right">€/hora</th>
                            <th className="py-1 text-right">Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        {factura.lineasManoDeObra.map((l, i) => (
                            <tr key={i} className="border-b">
                                <td className="py-1">{l.descripcion}</td>
                                {/* En horas decimales, igual que en el PDF */}
                                <td className="py-1 text-right">
                                    {formatearHoras(l.horas)}
                                </td>
                                <td className="py-1 text-right">
                                    {(Number(l.precioHora) || 0).toFixed(2)} €
                                </td>
                                <td className="py-1 text-right">
                                    {calcularManoDeObra(l.horas, l.precioHora).toFixed(2)} €
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Totales */}
            <div className="flex flex-col items-end gap-1 mb-6">
                <span>Total materiales: {totalMateriales.toFixed(2)} €</span>
                <span>Total mano de obra: {manoDeObra.toFixed(2)} €</span>
                <span>Base imponible: {baseImponible.toFixed(2)} €</span>
                <span>IVA ({factura.iva}%): {(total - baseImponible).toFixed(2)}
                    €</span>
                <span className="font-bold text-lg">TOTAL: {total.toFixed(2)} €</span>
            </div>

            <div className="flex gap-2">
                <button onClick={() => navigate('/')} className="border rounded px-4 py-2">
                    Volver
                </button>
                <button onClick={exportarPDF} disabled={exportando}
                    className="bg-green-600 text-white rounded px-4 py-2 disabled:opacity-60">
                    {exportando ? 'Generando PDF…' : 'Exportar PDF'}
                </button>
                <button onClick={eliminar} className="bg-red-600 text-white rounded px-4 py-2">
                    Eliminar
                </button>
            </div>

            {/* La hoja imprimible: fuera de pantalla, solo para poder capturarla al exportar */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '760px' }} ref={hojaRef}>
                <FacturaPDF factura={factura} config={config} />
            </div>
        </div>
    )
}

export default DetalleFactura