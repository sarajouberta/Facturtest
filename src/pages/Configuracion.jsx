import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useConfig, guardarConfig } from '../datos'

import { useNavigate } from 'react-router-dom'
import { nifValido, telefonoValido } from '../utils/validaciones'


function Configuracion() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  //
  const navigate = useNavigate()

  //para onboarding:
  const [primeraVez, setPrimeraVez] = useState(false)

  //al abrir la pantalla, se cargan los datos guardados (si existen)
  const config = useConfig()
    useEffect(() => {
      if (config === undefined) return   // aún cargando, nada
      if (config) reset(config)          // hay datos: rellenamos el formulario
      else setPrimeraVez(true)           // null: es la primera vez
    }, [config, reset])



  //al pulsar "Guardar", se escribe en la base de datos
  const onSubmit = async (datos) => {
    try {
      await guardarConfig(datos)
    } catch (error) {
      console.error('❌ Error al guardar la configuración:', error)
      alert('No se pudieron guardar los datos. Revisa la conexión e inténtalo de nuevo.')
      return
    }

    if (primeraVez) {
      navigate('/')            //primera vez: redirige a la pantalla principal
    } else {
      alert('Datos del taller guardados')   //editando: confirmamos y nos quedamos
    }
  }

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-bold mb-1">Configuración del taller</h2>
      <p className="text-sm text-gray-500 mb-4">Los campos con * son obligatorios.</p>

      {primeraVez && (
        <p className="bg-blue-50 text-blue-800 border border-blue-200 rounded p-3 mb-4 text-sm">
          👋 ¡Bienvenido! Antes de crear facturas, completa los datos de tu taller.
          Solo hay que hacerlo la primera vez.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Número inicial de factura</span>
        <input type="number" min="1" placeholder="p. ej. 1" className="border rounded px-3 py-2"
          onFocus={(e) => e.target.select()}
          {...register('numeroInicial', {
            valueAsNumber: true,
            min: { value: 1, message: 'El número inicial debe ser 1 o mayor' },
          })} />
        {errors.numeroInicial && (
          <span className="text-red-600 text-sm">{errors.numeroInicial.message}</span>
        )}
      </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Nombre comercial</span>
          <input className="border rounded px-3 py-2" {...register('nombre')}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Titular</span>
          <input className="border rounded px-3 py-2" {...register('titular')}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">NIF *</span>
          <input className="border rounded px-3 py-2" placeholder="p. ej. 12345678Z o B12345678"
            {...register('nif', {
              required: 'El NIF del taller es obligatorio',
              validate: (v) => nifValido(v) || 'NIF no válido',
            })} />
          {errors.nif && (
            <span className="text-red-600 text-sm">{errors.nif.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Actividad</span>
          <input className="border rounded px-3 py-2" placeholder="p. ej. Reparación de vehículos"
            {...register('actividad')} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Dirección</span>
          <input className="border rounded px-3 py-2" placeholder="p. ej. C/ Mayor 12, 33001 Oviedo"
            {...register('direccion')} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Teléfono</span>
          <input className="border rounded px-3 py-2" placeholder="p. ej. 985123456"
            {...register('telefono', {
              validate: (v) => !v || telefonoValido(v) || 'Teléfono no válido (9 cifras)',
            })} />
          {errors.telefono && (
            <span className="text-red-600 text-sm">{errors.telefono.message}</span>
          )}
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


/*Nota: cambios para incorporar onboarding:
- useState: recuerda un dato entre renders. Aquí, "¿es la primera vez?". Como ya consultábamos la config en el useEffect, no hacemos ninguna consulta extra: reutilizamos esa misma
  respuesta.
  - {primeraVez && (...)}: renderizado condicional: 
   si primeraVez es true, se pinta el <p>; si es false, no aparece nada. Cuando ya hay datos
  guardados, el mensaje no molesta.

 */