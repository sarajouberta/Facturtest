import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { generarSiguienteNumero } from '../utils/numeracion'
import {
  calcularTotalMateriales,
  calcularBaseImponible,
  calcularTotal,
} from '../utils/calculos'

function NuevaFactura() {
  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      numero: '',
      fecha: new Date().toISOString().slice(0, 10),
      cliente: {
        nombre: '',
        nif: '',
        direccion: '',
        localidad: '',
        provincia: '',
        telefono: '',
      },
      vehiculo: { modelo: '', vehiculo: '', matricula: '', km: '' },
      trabajos: '',
      conceptos: [{ descripcion: '', cantidad: 1, precioUnitario: 0 }],
      manoDeObra: 0,
      iva: 21,
    },
  })
  const { fields, append, remove } = useFieldArray({
    control, name: 'conceptos'
  })
  const navigate = useNavigate()

  // Valores observados en vivo para calcular los totales
  const conceptos = watch('conceptos')
  const manoDeObra = watch('manoDeObra')
  const iva = watch('iva')

  const totalMateriales = calcularTotalMateriales(conceptos)
  const baseImponible = calcularBaseImponible(totalMateriales, manoDeObra)
  const total = calcularTotal(baseImponible, iva)

  // Al abrir la pantalla, calculamos el siguiente número correlativo
  useEffect(() => {
    db.facturas.toArray().then((facturas) => {
      const anio = new Date().getFullYear()
      setValue('numero', generarSiguienteNumero(facturas, anio))
    })
  }, [setValue])

  const onSubmit = async (datos) => {
    // Recalculamos y "congelamos" los importes al guardar
    const totalMateriales = calcularTotalMateriales(datos.conceptos)
    const baseImponible = calcularBaseImponible(totalMateriales,
      datos.manoDeObra)
    const total = calcularTotal(baseImponible, datos.iva)

    await db.facturas.add({ ...datos, totalMateriales, baseImponible, total })
    navigate('/')
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Nueva factura</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* Número y fecha */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Factura</legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Número</span>
            <input className="border rounded px-3 py-2" {...register('numero')}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Fecha</span>
            <input type="date" className="border rounded px-3 py-2"
              {...register('fecha')} />
          </label>
        </fieldset>

        {/* Datos del cliente */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Cliente</legend>
          <input className="border rounded px-3 py-2" placeholder="Nombre"
            {...register('cliente.nombre')} />
          <input className="border rounded px-3 py-2" placeholder="DNI / CIF"
            {...register('cliente.nif')} />
          <input className="border rounded px-3 py-2" placeholder="Domicilio"
            {...register('cliente.direccion')} />
          <input className="border rounded px-3 py-2" placeholder="Localidad"
            {...register('cliente.localidad')} />
          <input className="border rounded px-3 py-2" placeholder="Provincia"
            {...register('cliente.provincia')} />
          <input className="border rounded px-3 py-2" placeholder="Teléfono"
            {...register('cliente.telefono')} />
        </fieldset>

        {/* Datos del vehículo */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Vehículo</legend>
          <input className="border rounded px-3 py-2" placeholder="Modelo"
            {...register('vehiculo.modelo')} />
          <input className="border rounded px-3 py-2" placeholder="Vehículo"
            {...register('vehiculo.vehiculo')} />
          <input className="border rounded px-3 py-2" placeholder="Matrícula"
            {...register('vehiculo.matricula')} />
          <input className="border rounded px-3 py-2" placeholder="Km"
            {...register('vehiculo.km')} />
        </fieldset>

        {/* Trabajos realizados */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Trabajos realizados</legend>
          <textarea
            className="border rounded px-3 py-2"
            rows="3"
            placeholder="Descripción de la reparación…"
            {...register('trabajos')}
          />
        </fieldset>

        {/* Materiales (líneas de concepto) */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Materiales</legend>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-center">
              <input
                className="border rounded px-3 py-2 flex-1"
                placeholder="Descripción"
                {...register(`conceptos.${index}.descripcion`)}
              />
              <input
                type="number"
                className="border rounded px-3 py-2 w-20"
                placeholder="Cant."
                {...register(`conceptos.${index}.cantidad`, {
                  valueAsNumber:
                    true
                })}
                onFocus={(e) => e.target.select()}
              />
              <input
                type="number"
                step="0.01"
                className="border rounded px-3 py-2 w-24"
                placeholder="Precio"
                {...register(`conceptos.${index}.precioUnitario`, {
                  valueAsNumber: true
                })}
                onFocus={(e) => e.target.select()}
              />
              <button type="button" onClick={() => remove(index)}
                className="text-red-600 px-2">
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => append({
              descripcion: '', cantidad: 1,
              precioUnitario: 0
            })}
            className="text-blue-600 self-start"
          >
            + Añadir material
          </button>
        </fieldset>

        {/* Mano de obra e IVA */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Mano de obra e IVA</legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Mano de obra (€)</span>
            <input
              type="number"
              step="0.01"
              className="border rounded px-3 py-2"
              {...register('manoDeObra', { valueAsNumber: true })}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">IVA (%)</span>
            <input
              type="number"
              className="border rounded px-3 py-2"
              {...register('iva', { valueAsNumber: true })}
              onFocus={(e) => e.target.select()}
            />
          </label>
        </fieldset>

        {/* Resumen de totales */}
        <div className="border rounded p-4 flex flex-col gap-1 items-end">
          <span>Total materiales: {totalMateriales.toFixed(2)} €</span>
          <span>Mano de obra: {(Number(manoDeObra) || 0).toFixed(2)} €</span>
          <span>Base imponible: {baseImponible.toFixed(2)} €</span>
          <span>IVA ({iva}%): {(total - baseImponible).toFixed(2)} €</span>
          <span className="font-bold text-lg">Total: {total.toFixed(2)}
            €</span>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 font-medium 
  self-start"
        >
          Guardar factura
        </button>
      </form>
    </div>
  )
}

export default NuevaFactura


/*Modificaciones tras obtener modelo de factura en papel:
- Bloques nuevos en defaultValues: vehiculo, trabajos, manoDeObra, y los campos
ampliados de cliente. Cada uno con su <fieldset> en el formulario.

- <textarea> para "Trabajos realizados" — es como un <input> pero de varias
líneas; se registra igual con {...register('trabajos')}.

- Cálculo en dos pasos: ahora totalMateriales (los materiales) y baseImponible
(materiales + mano de obra) son cosas distintas, y el resumen las muestra por
separado, igual que la factura de papel.

- onSubmit guarda los tres importes congelados: totalMateriales, baseImponible
y total. */