/*Nota: usa estilos en línea (style={{...}}) con colores hex, no Tailwind, para
  que la captura salga fiel y sin sustos*/
import { calcularManoDeObra } from '../utils/calculos'
import { formatearHoras } from '../utils/formato'

function FacturaPDF({ factura, config }) {
    if (!factura) return null

    const c = config || {}
    const cli = factura.cliente || {}
    const veh = factura.vehiculo || {}

    const totalMateriales = factura.totalMateriales ?? 0
    const manoDeObra = factura.manoDeObra ?? 0
    const baseImponible = factura.baseImponible ?? 0
    const total = factura.total ?? 0
    const ivaImporte = total - baseImponible

    const box = {
        border: '1px solid #333', padding: '8px', boxSizing:
            'border-box'
    }
    const th = {
        border: '1px solid #333', padding: '4px 6px', background:
            '#eee', textAlign: 'left'
    }
    const td = { border: '1px solid #333', padding: '4px 6px' }

    return (
        <div
            style={{
                width: '760px',
                padding: '32px',
                background: '#ffffff',
                color: '#111111',
                fontFamily: 'Arial, sans-serif',
                fontSize: '13px',
                boxSizing: 'border-box',
            }}
        >
            {/* Cabecera: taller */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start'
            }}>
                <div>
                    <div style={{
                        fontSize: '26px', fontWeight: 'bold'
                    }}>{c.nombre}</div>
                    <div style={{ fontStyle: 'italic' }}>{c.titular}</div>
                    <div style={{ fontSize: '12px' }}>N.I.F.: {c.nif}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px' }}>
                    <div>{c.actividad}</div>
                    <div>{c.direccion}</div>
                    <div>Tfno.: {c.telefono}</div>
                </div>
            </div>
            {/* Número y fecha */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', margin:
                    '16px 0'
            }}>
                <strong>FACTURA Nº: {factura.numero}</strong>
                <span>Fecha: {factura.fecha}</span>
            </div>

            {/* Cliente y vehículo */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ ...box, flex: 1 }}>
                    <div style={{
                        fontWeight: 'bold', marginBottom: '4px'
                    }}>Cliente</div>
                    <div>{cli.nombre}</div>
                    <div>{cli.direccion}</div>
                    <div>{cli.localidad} {cli.provincia}</div>
                    <div>DNI/CIF: {cli.nif}</div>
                    <div>Tlf.: {cli.telefono}</div>
                </div>
                <div style={{ ...box, flex: 1 }}>
                    <div style={{
                        fontWeight: 'bold', marginBottom: '4px'
                    }}>Vehículo</div>
                    <div>Modelo: {veh.modelo}</div>
                    <div>Vehículo: {veh.vehiculo}</div>
                    <div>Matrícula: {veh.matricula}</div>
                    <div>Km: {veh.km}</div>
                </div>
            </div>

            {/* Trabajos realizados */}
            {factura.trabajos && (
                <div style={{ ...box, marginTop: '12px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Trabajos
                        realizados</div>
                    <div style={{ whiteSpace: 'pre-line' }}>{factura.trabajos}</div>
                </div>
            )}

            {/* Materiales. Solo si hay: una factura de solo mano de obra es
                válida, y en ella esta tabla saldría como una cabecera suelta. */}
            {factura.conceptos?.length > 0 && (
            <table style={{
                width: '100%', borderCollapse: 'collapse', marginTop:
                    '12px'
            }}>
                <thead>
                    <tr>
                        <th style={{
                            ...th, width: '70px', textAlign: 'right'
                        }}>Cantidad</th>
                        <th style={th}>Descripción</th>
                        <th style={{
                            ...th, width: '90px', textAlign: 'right'
                        }}>Importe</th>
                    </tr>
                </thead>
                <tbody>
                    {(factura.conceptos || []).map((m, i) => (
                        <tr key={i}>
                            <td style={{ ...td, textAlign: 'right' }}>{m.cantidad}</td>
                            <td style={td}>{m.descripcion}</td>
                            <td style={{ ...td, textAlign: 'right' }}>
                                {(Number(m.cantidad) * Number(m.precioUnitario)).toFixed(2)} €
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            )}

            {/* Mano de obra desglosada. Solo las facturas nuevas llevan líneas;
                las antiguas guardaban un único importe y no entran aquí. */}
            {factura.lineasManoDeObra?.length > 0 && (
                <table style={{
                    width: '100%', borderCollapse: 'collapse', marginTop: '12px'
                }}>
                    <thead>
                        <tr>
                            <th style={th}>Mano de obra</th>
                            <th style={{ ...th, width: '70px', textAlign: 'right' }}>Cantidad</th>
                            <th style={{ ...th, width: '90px', textAlign: 'right' }}>Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        {factura.lineasManoDeObra.map((l, i) => (
                            <tr key={i}>
                                <td style={td}>
                                    {l.descripcion}
                                    {' '}
                                    <span style={{ color: '#6b7280' }}>
                                        ({(Number(l.precioHora) || 0).toFixed(2)} €)
                                    </span>
                                </td>
                                <td style={{ ...td, textAlign: 'right' }}>
                                    {formatearHoras(l.horas)}
                                </td>
                                <td style={{ ...td, textAlign: 'right' }}>
                                    {calcularManoDeObra(l.horas, l.precioHora).toFixed(2)} €
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Totales */}
            <div style={{
                display: 'flex', justifyContent: 'flex-end', marginTop:
                    '12px'
            }}>
                <table style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={td}>Total materiales</td>
                            <td style={{
                                ...td, textAlign: 'right'
                            }}>{totalMateriales.toFixed(2)} €</td>
                        </tr>
                        <tr>
                            <td style={td}>Total mano de obra</td>
                            <td style={{ ...td, textAlign: 'right' }}>{manoDeObra.toFixed(2)}
                                €</td>
                        </tr>
                        <tr>
                            <td style={td}>Base imponible</td>
                            <td style={{
                                ...td, textAlign: 'right'
                            }}>{baseImponible.toFixed(2)} €</td>
                        </tr>
                        <tr>
                            <td style={td}>IVA ({factura.iva}%)</td>
                            <td style={{ ...td, textAlign: 'right' }}>{ivaImporte.toFixed(2)}
                                €</td>
                        </tr>
                        <tr>
                            <td style={{ ...td, fontWeight: 'bold' }}>TOTAL</td>
                            <td style={{
                                ...td, textAlign: 'right', fontWeight: 'bold'
                            }}>{total.toFixed(2)} €</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Pie */}
            <div style={{ marginTop: '32px', fontSize: '11px' }}>
                Doy mi conformidad a la reparación y al importe facturado, recibiendo
                el vehículo
                a mi entera satisfacción.
                <div style={{ marginTop: '24px' }}>(firma)</div>
            </div>
        </div>
    )
}

export default FacturaPDF