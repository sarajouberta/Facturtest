import { useEffect } from 'react'
  import { useForm } from 'react-hook-form'
  import { db } from '../db'

  function Configuracion() {
    const { register, handleSubmit, reset } = useForm()

    //al abrir la pantalla, se cargan los datos guardados (si existen)
    useEffect(() => {
      db.config.get(1).then((config) => {
        if (config) reset(config)
      })
    }, [reset])

    //al pulsar "Guardar", se escribe en la base de datos
    const onSubmit = async (datos) => {
      await db.config.put({ ...datos, id: 1 })
      alert('Datos del taller guardados ✅')
    }

    return (
      <div className="max-w-md">
        <h2 className="text-xl font-bold mb-4">Configuración del taller</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Nombre / razón social</span>
            <input className="border rounded px-3 py-2" {...register('nombre')} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Teléfono</span>
            <input className="border rounded px-3 py-2" {...register('telefono')} />
          </label>

          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 font-medium mt-2"
          >
            Guardar
          </button>
        </form>
      </div>
    )
  }

  export default Configuracion