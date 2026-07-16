import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useFacturas, useConfig, crearFactura } from '../datos'

import { generarSiguienteNumero } from '../utils/numeracion'
import { nifValido, telefonoValido } from '../utils/validaciones'
import {
  calcularTotalMateriales,
  calcularBaseImponible,
  calcularTotal,
} from '../utils/calculos'

function NuevaFactura() {
  const { register, control, handleSubmit, watch, setValue, setError,
    formState: { errors } } = useForm({
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

  //Al abrir la pantalla se calcula el siguiente número correlativo.
  //Los hooks (useFacturas/useConfig) se repintan solos cuando llegan los datos
  //de Firestore, por eso esperamos a que ambos hayan cargado (undefined = aún
  //cargando). config?: cubre el caso de que todavía no haya config guardada.
  const facturas = useFacturas()
    const config = useConfig()
    useEffect(() => {
      if (facturas === undefined || config === undefined) return   // esperamos a que carguen
      setValue('numero', generarSiguienteNumero(facturas, config?.numeroInicial))
    }, [facturas, config, setValue])

  const onSubmit = async (datos) => {
    // Recalculamos y "congelamos" los importes al guardar
    const totalMateriales = calcularTotalMateriales(datos.conceptos)
    const baseImponible = calcularBaseImponible(totalMateriales,
      datos.manoDeObra)
    const total = calcularTotal(baseImponible, datos.iva)

    //Regla de negocio: la factura debe tener algún importe.
    //Cambio: aunque sean casos muy raros, la factura puede no tener mano de obra (ej. cambiar batería no la cobra)
    if (baseImponible <= 0) {
      setError('manoDeObra', {
        type: 'manual',
        message: 'La factura debe tener piezas o mano de obra (no puede ser 0 €)',
      })
      return
    }

    await crearFactura({ ...datos, totalMateriales, baseImponible, total })

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
            <input type="number" min="1" className="border rounded px-3 py-2"
              {...register('numero', { required: 'El número es obligatorio' })}
            />
            {errors.numero && (
              <span className="text-red-600 text-sm">{errors.numero.message}</span>
            )}
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
            {...register('cliente.nombre',{ required: 'El nombre del cliente es obligatorio' })} />
            {errors.cliente?.nombre && (
              <span className="text-red-600 text-sm">{errors.cliente.nombre.message}</span>
            )}
          <input className="border rounded px-3 py-2" placeholder="DNI / CIF"
            {...register('cliente.nif', {
              required: 'El DNI del cliente es obligatorio',
              validate: (v) => nifValido(v) || 'DNI/CIF no válido',
            })} />
            {errors.cliente?.nif && (
              <span className="text-red-600 text-sm">{errors.cliente.nif.message}</span>
            )}
          <input className="border rounded px-3 py-2" placeholder="Domicilio"
            {...register('cliente.direccion')} />
          <input className="border rounded px-3 py-2" placeholder="Localidad"
            {...register('cliente.localidad')} />
          <input className="border rounded px-3 py-2" placeholder="Provincia"
            {...register('cliente.provincia')} />
          <input className="border rounded px-3 py-2" placeholder="Teléfono"
            {...register('cliente.telefono', {
              validate: (v) => !v || telefonoValido(v) || 'Teléfono no válido (9 cifras)',
            })} />
            {errors.cliente?.telefono && (
              <span className="text-red-600 text-sm">{errors.cliente.telefono.message}</span>
            )}
        </fieldset>

        {/* Datos del vehículo */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Vehículo</legend>
          <input className="border rounded px-3 py-2" placeholder="Modelo"
            {...register('vehiculo.modelo', { required: 'El modelo es obligatorio' })} />
          {errors.vehiculo?.modelo && (
            <span className="text-red-600 text-sm">{errors.vehiculo.modelo.message}</span>
          )}
          <input className="border rounded px-3 py-2" placeholder="Vehículo"
            {...register('vehiculo.vehiculo', { required: 'El vehículo (marca) es obligatorio' })} />
          {errors.vehiculo?.vehiculo && (
            <span className="text-red-600 text-sm">{errors.vehiculo.vehiculo.message}</span>
          )}
          <input className="border rounded px-3 py-2" placeholder="Matrícula"
            {...register('vehiculo.matricula', { required: 'La matrícula es obligatoria' })} />
          {errors.vehiculo?.matricula && (
            <span className="text-red-600 text-sm">{errors.vehiculo.matricula.message}</span>
          )}
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
                min="1"
                className="border rounded px-3 py-2 w-20"
                placeholder="Cant."
                {...register(`conceptos.${index}.cantidad`, {
                  valueAsNumber: true,
                  min: { value: 1, message: 'La cantidad mínima es 1' },
                })}
                onFocus={(e) => e.target.select()}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                className="border rounded px-3 py-2 w-24"
                placeholder="Precio"
                {...register(`conceptos.${index}.precioUnitario`, {
                  valueAsNumber: true,
                  min: { value: 0, message: 'El precio no puede ser negativo' },
                })}
                onFocus={(e) => e.target.select()}
              />
              <button type="button" onClick={() => remove(index)}
                className="text-red-600 px-2">
                ✕
              </button>
            </div>
          ))}
          {errors.conceptos && (
            <span className="text-red-600 text-sm">
              Revisa las cantidades y los precios de los materiales.
            </span>
          )}
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
              min="0"
              className="border rounded px-3 py-2"
              {...register('manoDeObra', {
                valueAsNumber: true,
                min: { value: 0, message: 'La mano de obra no puede ser negativa' },
              })}
              onFocus={(e) => e.target.select()}
            />
            {errors.manoDeObra && (
              <span className="text-red-600 text-sm">{errors.manoDeObra.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">IVA (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              className="border rounded px-3 py-2"
              {...register('iva', {
                valueAsNumber: true,
                min: { value: 0, message: 'El IVA debe estar entre 0 y 100' },
                max: { value: 100, message: 'El IVA debe estar entre 0 y 100' },
              })}
              onFocus={(e) => e.target.select()}
            />
            {errors.iva && (
              <span className="text-red-600 text-sm">{errors.iva.message}</span>
            )}
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