import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useConfig, guardarConfig } from '../datos'

import { useNavigate } from 'react-router-dom'
import { nifValido, telefonoValido } from '../utils/validaciones'
import { camposConfigPendientes, clavesConfigPendientes } from '../utils/configuracion'
import { numeroDesdeTexto, formatearDecimal } from '../utils/formato'
import ErrorDatos from '../components/ErrorDatos'


function Configuracion() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  //
  const navigate = useNavigate()

  //para onboarding:
  const [primeraVez, setPrimeraVez] = useState(false)

  //aviso de "guardado" en la propia página, en vez de un alert del navegador
  const [guardado, setGuardado] = useState(false)

  //al abrir la pantalla, se cargan los datos guardados (si existen)
  const { config, error: errorConfig } = useConfig()
  useEffect(() => {
    if (config === undefined) return   // aún cargando, nada
    if (config) {
      /* La tarifa se guarda como número (46.5) pero el campo es de texto: se
         formatea al rellenarlo para que se vea '46,50', tal y como se escribió,
         y no '46.5'. Si no hay valor, se deja vacío para que salga el placeholder
         (y no un '0,00' que parecería un dato de verdad). */
      reset({
        ...config,
        precioManoDeObra: Number.isFinite(config.precioManoDeObra)
          ? formatearDecimal(config.precioManoDeObra)
          : '',
      })
    } else {
      setPrimeraVez(true)              // null: es la primera vez
    }
  }, [config, reset])



  //al pulsar "Guardar", se escribe en la base de datos
  const onSubmit = async (datos) => {
    setGuardado(false)   // se limpia el aviso anterior por si es un segundo intento
    /* La tarifa se teclea como texto y puede llevar coma ('46,50'): se convierte
       aquí, al guardar, y no con setValueAs, porque setValueAs se ejecuta ANTES
       de validar y el pattern recibiría un número ya convertido — con lo que no
       rechazaría nunca nada. */
    /* Un campo vaciado se guarda como null, no como 0: son cosas distintas.
       numeroDesdeTexto('') devuelve 0, y un 0 guardado se leería como "hay
       tarifa, y vale cero", ocultando el aviso de campo pendiente. */
    const tarifa = String(datos.precioManoDeObra ?? '').trim()
    const aGuardar = {
      ...datos,
      precioManoDeObra: tarifa === '' ? null : numeroDesdeTexto(tarifa),
    }
    try {
      await guardarConfig(aGuardar)
    } catch (error) {
      console.error('❌ Error al guardar la configuración:', error)
      alert('No se pudieron guardar los datos. Revisa la conexión e inténtalo de nuevo.')
      return
    }

    if (primeraVez) {
      navigate('/')            //primera vez: redirige a la pantalla principal
    } else {
      //editando: confirmamos y nos quedamos. El alert corta y obliga a enterarse;
      //el aviso en página queda visible después, al cerrarlo.
      alert('Datos del taller guardados')
      setGuardado(true)
    }
  }

  // Campos que faltan en lo YA guardado (no en lo que se esté escribiendo ahora)
  const pendientes = config === undefined ? [] : camposConfigPendientes(config)
  const clavesPendientes = config === undefined ? [] : clavesConfigPendientes(config)

  /* Clases del input: el borde se pone rojo si ese campo es uno de los que
     menciona el aviso. Se calcula desde la MISMA fuente que el aviso, para que
     no puedan contradecirse. */
  const claseCampo = (clave) =>
    `border rounded px-3 py-2 ${clavesPendientes.includes(clave) ? 'border-red-500' : ''}`

  /* Si falló la lectura no se muestra el formulario: saldría vacío y guardar
     machacaría los datos buenos que hay en la base con un formulario en blanco. */
  if (errorConfig) {
    return (
      <ErrorDatos error={errorConfig}>
        No se han podido cargar los datos del taller.
      </ErrorDatos>
    )
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

      {/* Confirmación de guardado, en el mismo sitio que el aviso de campos
          pendientes: al guardar bien, el verde ocupa el lugar del amarillo.
          role="status" hace que los lectores de pantalla lo anuncien sin robar
          el foco. */}
      {guardado && (
        <p role="status"
          className="bg-green-50 text-green-800 border border-green-200 rounded p-3 mb-4 text-sm">
          ✅ Datos del taller guardados.
        </p>
      )}

      {/* Si ya había configuración pero le faltan campos (por ejemplo, los que se
          añadieron después de guardarla), se señalan aquí. En la primera vez no,
          que ahí falta todo por definición y ya lo dice el mensaje de bienvenida.
          Si tras guardar siguen faltando, este aviso se queda debajo del verde:
          es información que no conviene esconder. */}
      {!primeraVez && pendientes.length > 0 && (
        <p className="bg-yellow-50 text-yellow-900 border border-yellow-300 rounded p-3 mb-4 text-sm">
          ⚠️ Faltan por rellenar: <strong>{pendientes.join(', ')}</strong>.
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
          <span className="text-sm font-medium">Precio mano de obra (€/hora)</span>
          {/* Campo de texto con nuestra propia regla, igual que los importes de la
              factura: con type="number", un precio escrito con coma puede quedarse
              vacío según el navegador y guardarse como NaN sin avisar. Y este valor
              es el que prerrellena la tarifa de todas las líneas nuevas. */}
          <input type="text" inputMode="decimal" placeholder="p. ej. 46,50"
            className={claseCampo('precioManoDeObra')}
            onFocus={(e) => e.target.select()}
            {...register('precioManoDeObra', {
              pattern: {
                value: /^\d*([.,]\d{1,2})?$/,
                message: 'La tarifa va en euros por hora, p. ej. 46,50 (máximo 2 decimales)',
              },
            })} />
          {errors.precioManoDeObra && (
            <span className="text-red-600 text-sm">{errors.precioManoDeObra.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">IVA (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            className={claseCampo('iva')}
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

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Nombre comercial</span>
          <input className={claseCampo('nombre')} {...register('nombre')}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Titular</span>
          <input className="border rounded px-3 py-2" {...register('titular')}
          />
        </label>

        <label className="flex flex-col gap-1">
          {/* Obligatorio: en negrita, además del asterisco */}
          <span className="text-sm font-bold">NIF *</span>
          <input className={claseCampo('nif')} placeholder="p. ej. 12345678Z o B12345678"
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
          <input className="border rounded px-3 py-2" placeholder="p. ej. Reparación del Automóvil"
            {...register('actividad')} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Dirección</span>
          <input className="border rounded px-3 py-2" placeholder="p. ej. C/ Gil Blas X, 3300X Oviedo"
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