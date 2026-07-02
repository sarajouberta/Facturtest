import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { calcularBaseImponible, calcularTotal } from '../utils/calculos'
import { useEffect } from 'react'
import { db } from '../db'
import { generarSiguienteNumero } from '../utils/numeracion'

function NuevaFactura() {
  const { register, control, handleSubmit, watch, setValue } = useForm({
    //defaultvalues: se define la forma inicial del formulario:
    defaultValues: {
      numero: '',
      //new Date().toISOString().slice(0, 10) te da la fecha de hoy en formato 2026-07-02:
      fecha: new Date().toISOString().slice(0, 10),
      cliente: { nombre: '', nif: '', direccion: '' },
      conceptos: [{ descripcion: '', cantidad: 1, precioUnitario: 0 }],
      iva: 21,
    },
  })

  /*useFieldArray gestiona la lista dinámica de conceptos = es un hook de React que da acceso a 
    capacidades dentro de un "componente"(), como guardar estado, ejecutar código en ciertos momentos...
    Recibe: control, que conecta con el formulario, y name ("conceptos"), qué campo es el arrya
    
    Nota: un hook se puede ver como algo parecido a la inyección de dependencias: en vez de que tú montes a mano toda la maquinaria (el estado, la suscripción a eventos, la conexión
    al formulario), pides esa capacidad llamando al hook y React te la "inyecta" ya lista para usar
    1. Solo se llaman en el nivel superior del componente — nunca dentro de un if, un bucle o una función anidada. Siempre al principio, "en el cuerpo" del componente.
    2. Solo dentro de componentes React (o de otros hooks), no en funciones normales*/
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'conceptos',
  })

  const navigate = useNavigate()

  /*al abrir la pantalla, calculamos el siguiente número correlativo
  useEffect consulta la BD al abrir la pantalla (con db.facturas.toArray(), que trae todas las facturas), calcula el siguiente número y lo mete en el campo con setValue.
  - Como el campo es un input normal con register('numero'), el usuario puede sobrescribirlo si quiere
  - Al no haber facturas todavía, se ve algo tipo F-2026-001*/
  useEffect(() => {
    db.facturas.toArray().then((facturas) => {
      const anio = new Date().getFullYear()
      setValue('numero', generarSiguienteNumero(facturas, anio))
    })
  }, [setValue])


  //watch observa los valores del formulario en tiempo real:
  const conceptos = watch('conceptos')
  const iva = watch('iva')

  //se recalcula en cada render con las funciones de utils/calculos:
  const baseImponible = calcularBaseImponible(conceptos)
  const total = calcularTotal(baseImponible, iva)


  const onSubmit = async (datos) => {
    //console.log('Factura:', datos) //de momento, solo lo mostramos

    //se recalcula base y total a partir de los datos enviados y se guardan:
    const baseImponible = calcularBaseImponible(datos.conceptos)
    const total = calcularTotal(baseImponible, datos.iva)

    await db.facturas.add({
      ...datos,
      baseImponible,
      total,
    })

    navigate('/') // volvemos a la lista de facturas
  }


  /*..register: se registra un campo dentro del array: usando la ruta con el índice. React Hook Form entiende esa notación con puntos y
  construye el objeto anidado
  valueAsNumberr: por defecto, los <input> devuelvent texto*/
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Nueva factura</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Número y fecha */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Factura</legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Número</span>
            <input className="border rounded px-3 py-2" {...register('numero')} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Fecha</span>
            <input type="date" className="border rounded px-3 py-2" {...register('fecha')} />
          </label>
        </fieldset>

        {/* Datos del cliente */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Cliente</legend>

          <input
            className="border rounded px-3 py-2"
            placeholder="Nombre"
            {...register('cliente.nombre')}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="NIF / DNI"
            {...register('cliente.nif')}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Dirección"
            {...register('cliente.direccion')}
          />
        </fieldset>

        {/* Líneas de concepto */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Conceptos</legend>
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
                {...register(`conceptos.${index}.cantidad`, { valueAsNumber: true })}
              />
              <input
                type="number"
                step="0.01"
                className="border rounded px-3 py-2 w-24"
                placeholder="Precio"
                {...register(`conceptos.${index}.precioUnitario`, { valueAsNumber: true })}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-red-600 px-2"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => append({ descripcion: '', cantidad: 1, precioUnitario: 0 })}
            className="text-blue-600 self-start"
          >
            + Añadir concepto
          </button>
        </fieldset>

        {/* Resumen de totales */}
        <div className="border rounded p-4 flex flex-col gap-1 items-end">
          <span>Base imponible: {baseImponible.toFixed(2)} €</span>
          <span>IVA ({iva}%): {(total - baseImponible).toFixed(2)} €</span>
          <span className="font-bold text-lg">Total: {total.toFixed(2)} €</span>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 font-medium self-start"
        >
          Guardar factura
        </button>
      </form>
    </div>
  )
}

export default NuevaFactura
