import { useForm, useFieldArray } from 'react-hook-form'

function NuevaFactura() {
  const { register, control, handleSubmit } = useForm({
    //defaultvalues: se define la forma inicial del formulario:
    defaultValues: {  
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

  const onSubmit = (datos) => {
    console.log('Factura:', datos) //de momento, solo lo mostramos
  }

  /*..register: se registra un campo dentro del array: usando la ruta con el índice. React Hook Form entiende esa notación con puntos y
  construye el objeto anidado
  valueAsNumberr: por defecto, los <input> devuelvent texto*/
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Nueva factura</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

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
