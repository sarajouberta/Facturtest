import { useEffect, useState, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { useFacturas, useConfig, crearFactura } from '../datos'

import { generarSiguienteNumero, numeroYaUsado } from '../utils/numeracion'
import { nifValido, telefonoValido } from '../utils/validaciones'
import { matriculaParaGuardar } from '../utils/matricula'
import { buscarPorMatricula } from '../utils/busqueda'
import { limpiarConceptos, limpiarLineasManoDeObra } from '../utils/lineas'
import { numeroDesdeTexto } from '../utils/formato'
import { camposConfigPendientes } from '../utils/configuracion'
import ErrorDatos from '../components/ErrorDatos'
import {
  calcularTotalMateriales,
  calcularBaseImponible,
  calcularTotal,
  calcularManoDeObra,
  calcularTotalManoDeObra,
} from '../utils/calculos'

function NuevaFactura() {
  const { register, control, handleSubmit, watch, setValue, getValues, setError,
    formState: { errors } } = useForm({
      /* onTouched: cada campo se valida al salir de él por primera vez, y a partir
         de ahí mientras se escribe. Por defecto RHF solo valida al enviar, así que
         los errores no aparecían hasta pulsar Guardar. */
      mode: 'onTouched',
      defaultValues: {
        numero: '',
        /* 'sv-SE' es el único locale estándar que da el formato AAAA-MM-DD que
           necesita <input type="date">, pero calculado en la zona horaria del
           dispositivo. Con toISOString() la fecha se calcula en UTC y, de
           madrugada, saldría el día anterior. */
        fecha: new Date().toLocaleDateString('sv-SE'),
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
        /* precioUnitario arranca vacío, no a 0: ese 0 era el valor real del campo
           y había que borrarlo a mano para escribir encima. Vacío deja ver el
           placeholder y se convierte a 0 al guardar. */
        conceptos: [{ descripcion: '', cantidad: 1, precioUnitario: '' }],
        /* Cada línea de mano de obra es una tarea: qué se hizo, cuánto tiempo
           (horas en decimal: 0,80 = 48 min) y a qué tarifa. La tarifa se
           rellena desde la configuración del taller en cuanto carga. */
        lineasManoDeObra: [{ descripcion: '', horas: '', precioHora: 0 }],
        iva: 21,
      },
    })
  const { fields, append, remove } = useFieldArray({
    control, name: 'conceptos'
  })
  /* Segundo array, independiente del de materiales. Sus fields/append/remove se
     renombran al desestructurar porque los nombres originales ya están ocupados:
     si se reutilizaran, las dos listas compartirían estado y serían la misma
     pintada dos veces. */
  const {
    fields: fieldsManoDeObra,
    append: appendManoDeObra,
    remove: removeManoDeObra,
  } = useFieldArray({ control, name: 'lineasManoDeObra' })
  const navigate = useNavigate()
  const [vehiculoRecurrente, setVehiculoRecurrente] = useState(null)

  // Valores observados en vivo para calcular los totales
  const conceptos = watch('conceptos')
  const lineasManoDeObra = watch('lineasManoDeObra')
  const iva = watch('iva')

  /* Los totales en vivo se calculan sobre las líneas ya normalizadas, con la MISMA
     función que al guardar: los importes se teclean como texto y pueden llevar
     coma, y Number('46,50') es NaN. Así lo que se ve y lo que se graba coinciden. */
  const totalMateriales = calcularTotalMateriales(limpiarConceptos(conceptos))
  /* La mano de obra ya no se teclea: sale de sumar las líneas. Se normalizan
     antes con la MISMA función que al guardar, porque las horas llegan como
     texto y pueden traer coma: Number('0,5') es NaN y el total saldría a 0.
     Usar la misma tubería garantiza que lo que se ve en vivo y lo que se graba
     sean el mismo número. */
  const manoDeObra = calcularTotalManoDeObra(limpiarLineasManoDeObra(lineasManoDeObra))
  const baseImponible = calcularBaseImponible(totalMateriales, manoDeObra)
  const total = calcularTotal(baseImponible, iva)

  //Al abrir la pantalla se calcula el siguiente número correlativo.
  //Los hooks (useFacturas/useConfig) se repintan solos cuando llegan los datos
  //de Firestore, por eso esperamos a que ambos hayan cargado (undefined = aún
  //cargando). config?: cubre el caso de que todavía no haya config guardada.
  const { facturas, error: errorFacturas } = useFacturas()
  const { config, error: errorConfig } = useConfig()
  /* Los valores sugeridos se aplican UNA sola vez. Sin esto, el efecto vuelve a
     ejecutarse cada vez que llegan datos nuevos por onSnapshot (una factura
     guardada desde el móvil, un cambio de configuración desde otro dispositivo)
     y sobrescribiría lo que el usuario tenga escrito a medio rellenar.
     useRef y no useState: cambiarlo no debe provocar un repintado. */
  const sugerenciasAplicadas = useRef(false)

  useEffect(() => {
    if (facturas === undefined || config === undefined) return   // esperamos a que carguen
    if (sugerenciasAplicadas.current) return
    sugerenciasAplicadas.current = true

    setValue('numero', generarSiguienteNumero(facturas, config?.numeroInicial))

    /* El IVA y la tarifa de mano de obra también salen de la configuración.
       Number.isFinite descarta el NaN que deja un campo numérico vacío
       (valueAsNumber): un ?? no serviría, porque NaN no es null ni undefined. */
    if (Number.isFinite(config?.iva)) setValue('iva', config.iva)

    if (Number.isFinite(config?.precioManoDeObra)) {
      // Solo las líneas que aún no tienen tarifa, para no pisar una escrita a mano.
      getValues('lineasManoDeObra').forEach((linea, i) => {
        if (!linea.precioHora) {
          setValue(`lineasManoDeObra.${i}.precioHora`, config.precioManoDeObra)
        }
      })
    }
  }, [facturas, config, setValue, getValues])

  /* Datos del taller que faltan por rellenar. Mientras la config carga (undefined)
     no se avisa de nada, para que no parpadee el aviso al abrir la pantalla. */
  const pendientesConfig = config === undefined ? [] : camposConfigPendientes(config)

  // register de la matrícula en una variable para poder encadenar su onBlur
  // (validación de RHF) con nuestra búsqueda de vehículo recurrente.
  const matriculaReg = register('vehiculo.matricula', { required: 'La matrícula es obligatoria' })

  // Al salir del campo matrícula, buscamos si ese vehículo ya existe en facturas
  // anteriores, para ofrecer rellenar sus datos (cliente recurrente).
  const buscarVehiculo = (matricula) => {
    setVehiculoRecurrente(buscarPorMatricula(facturas ?? [], matricula))
  }

  // Rellena cliente y marca/modelo con los de la factura encontrada. No tocamos
  // la matrícula (ya está) ni los km (cambian en cada visita).
  const rellenarVehiculoRecurrente = () => {
    if (!vehiculoRecurrente) return
    setValue('cliente', vehiculoRecurrente.cliente, { shouldValidate: true })
    setValue('vehiculo.vehiculo', vehiculoRecurrente.vehiculo?.vehiculo ?? '', { shouldValidate: true })
    setValue('vehiculo.modelo', vehiculoRecurrente.vehiculo?.modelo ?? '', { shouldValidate: true })
    setVehiculoRecurrente(null)
  }

  const onSubmit = async (datos) => {
    /* Primero se limpian las líneas: se normalizan los números y se descartan las
       que estén vacías (el formulario arranca con una de cada tipo, y si no se
       rellenan acababan guardadas como filas en blanco). Los totales se calculan
       ya sobre lo limpio, que es lo que se va a guardar. */
    const conceptos = limpiarConceptos(datos.conceptos)
    const lineasManoDeObra = limpiarLineasManoDeObra(datos.lineasManoDeObra)

    // Recalculamos y "congelamos" los importes al guardar
    const totalMateriales = calcularTotalMateriales(conceptos)
    const manoDeObra = calcularTotalManoDeObra(lineasManoDeObra)
    const baseImponible = calcularBaseImponible(totalMateriales, manoDeObra)
    const total = calcularTotal(baseImponible, datos.iva)

    //Regla de negocio: la factura debe tener algún importe.
    //Cambio: aunque sean casos muy raros, la factura puede no tener mano de obra (ej. cambiar batería no la cobra)
    if (baseImponible <= 0) {
      /* Es una regla del formulario entero, no de un campo concreto: por eso va
         en 'root' y se pinta junto a los totales. Antes colgaba de 'manoDeObra',
         que ya no existe como campo. */
      setError('root.importe', {
        type: 'manual',
        message: 'La factura debe tener piezas o mano de obra (no puede ser 0 €)',
      })
      return
    }

    // La matrícula se guarda normalizada (MAYÚSCULAS y pegada, p. ej. 1234ABC),
    // así en la factura sale siempre uniforme, teclee como teclee.
    const matricula = matriculaParaGuardar(datos.vehiculo?.matricula)

    try {
      const referencia = await crearFactura({
        ...datos,
        conceptos,
        lineasManoDeObra,
        vehiculo: { ...datos.vehiculo, matricula },
        totalMateriales,
        /* Se guarda el importe total de la mano de obra ya calculado, además de
           las líneas (que van dentro de ...datos). Una factura es un documento
           emitido: debe conservar la cifra que se cobró, no una que se recalcule
           si mañana cambia la tarifa. Además, las facturas antiguas solo tienen
           este campo, y así todas se leen igual. */
        manoDeObra,
        baseImponible,
        total,
      })

      // Se redirige al detalle de la factura recién creada al guardarse correctamente.
      navigate(`/factura/${referencia.id}`, { replace: true })

    } catch (error) {
      console.error('❌ Error al guardar la factura:', error)
      alert('No se pudo guardar la factura. Revisa la conexión e inténtalo de nuevo.')
    }
  }

  /* Si falla la lectura no se deja facturar: sin las facturas existentes no se
     puede calcular el número correlativo ni detectar duplicados, así que se
     emitiría con un número equivocado. */
  const errorDatos = errorFacturas || errorConfig
  if (errorDatos) {
    return (
      <ErrorDatos error={errorDatos}>
        No se han podido cargar los datos necesarios para crear la factura.
      </ErrorDatos>
    )
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-1">Nueva factura</h2>
      <p className="text-sm text-gray-500 mb-4">Los campos con * son obligatorios.</p>

      {/* Avisa, pero no bloquea: se puede facturar rellenando los datos a mano */}
      {pendientesConfig.length > 0 && (
        <div className="bg-yellow-50 text-yellow-900 border border-yellow-300 rounded p-3 mb-4 text-sm">
          ⚠️ Faltan datos del taller en la configuración:{' '}
          <strong>{pendientesConfig.join(', ')}</strong>. Sin ellos, la factura puede salir
          incompleta o con la tarifa a 0.{' '}
          <Link to="/configuracion" className="underline font-medium">Completar ahora</Link>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* Número y fecha */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Factura</legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">Número *</span>
            <input type="number" min="1" className="border rounded px-3 py-2"
              {...register('numero', {
                required: 'El número es obligatorio',
                // El número se sugiere solo, pero es editable: hay que comprobar
                // que no se repita. Dos facturas con el mismo número no son válidas.
                validate: (valor) =>
                  !numeroYaUsado(facturas, valor) || 'Ya existe una factura con ese número',
              })}
            />
            {errors.numero && (
              <span className="text-red-600 text-sm">{errors.numero.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">Fecha *</span>
            <input type="date" className="border rounded px-3 py-2"
              {...register('fecha', { required: 'La fecha es obligatoria' })} />
            {errors.fecha && (
              <span className="text-red-600 text-sm">{errors.fecha.message}</span>
            )}
          </label>
        </fieldset>

        {/* Datos del vehículo — primero, porque la matrícula reconoce al cliente */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Vehículo</legend>
          {/* Etiqueta = el nombre del campo (siempre visible); placeholder = un
              ejemplo. Antes el nombre iba en el placeholder y desaparecía al
              escribir, dejando casillas sin identificar. */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">Matrícula *</span>
            <input className="border rounded px-3 py-2" placeholder="p. ej. 1234 ABC"
              {...matriculaReg}
              onBlur={(e) => { matriculaReg.onBlur(e); buscarVehiculo(e.target.value) }} />
            {errors.vehiculo?.matricula && (
              <span className="text-red-600 text-sm">{errors.vehiculo.matricula.message}</span>
            )}
          </label>
          {vehiculoRecurrente && (
            <div className="bg-blue-50 text-blue-800 border border-blue-200 rounded p-3 text-sm flex items-center justify-between gap-2">
              <span> Este vehículo ya está: <strong>{vehiculoRecurrente.cliente?.nombre}</strong>. ¿Rellenar sus datos?</span>
              <button
                type="button"
                onClick={rellenarVehiculoRecurrente}
                className="bg-blue-600 text-white rounded px-3 py-1 font-medium shrink-0"
              >
                Rellenar
              </button>
            </div>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">Marca *</span>
            <input className="border rounded px-3 py-2" placeholder="p. ej. Renault"
              {...register('vehiculo.vehiculo', { required: 'La marca es obligatoria' })} />
            {errors.vehiculo?.vehiculo && (
              <span className="text-red-600 text-sm">{errors.vehiculo.vehiculo.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">Modelo *</span>
            <input className="border rounded px-3 py-2" placeholder="p. ej. Clio"
              {...register('vehiculo.modelo', { required: 'El modelo es obligatorio' })} />
            {errors.vehiculo?.modelo && (
              <span className="text-red-600 text-sm">{errors.vehiculo.modelo.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Km</span>
            {/* Opcional, pero si se rellena tiene que ser un número: hasta ahora
                admitía cualquier texto y acababa impreso tal cual en la factura.
                Enteros, sin decimales ni separador de miles. */}
            <input className="border rounded px-3 py-2" inputMode="numeric"
              placeholder="p. ej. 150000"
              {...register('vehiculo.km', {
                pattern: {
                  value: /^\d*$/,
                  message: 'Los kilómetros van en números, sin puntos ni letras',
                },
              })} />
            {errors.vehiculo?.km && (
              <span className="text-red-600 text-sm">{errors.vehiculo.km.message}</span>
            )}
          </label>
        </fieldset>


        {/* Datos del cliente */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Cliente</legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">Nombre *</span>
            <input className="border rounded px-3 py-2" placeholder="Nombre y apellidos"
              {...register('cliente.nombre', { required: 'El nombre del cliente es obligatorio' })} />
            {errors.cliente?.nombre && (
              <span className="text-red-600 text-sm">{errors.cliente.nombre.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">DNI / CIF *</span>
            <input className="border rounded px-3 py-2" placeholder="p. ej. 12345678Z"
              {...register('cliente.nif', {
                required: 'El DNI del cliente es obligatorio',
                validate: (v) => nifValido(v) || 'DNI/CIF no válido',
              })} />
            {errors.cliente?.nif && (
              <span className="text-red-600 text-sm">{errors.cliente.nif.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Domicilio</span>
            <input className="border rounded px-3 py-2" placeholder="p. ej. C/ Uría 12, 3º B"
              {...register('cliente.direccion')} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Localidad</span>
            <input className="border rounded px-3 py-2" placeholder="p. ej. Oviedo"
              {...register('cliente.localidad')} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Provincia</span>
            <input className="border rounded px-3 py-2" placeholder="p. ej. Asturias"
              {...register('cliente.provincia')} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Teléfono</span>
            <input className="border rounded px-3 py-2" placeholder="p. ej. 600123456"
              {...register('cliente.telefono', {
                validate: (v) => !v || telefonoValido(v) || 'Teléfono no válido (9 cifras)',
              })} />
            {errors.cliente?.telefono && (
              <span className="text-red-600 text-sm">{errors.cliente.telefono.message}</span>
            )}
          </label>
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
          {/* Cabecera de columnas. Hace falta porque los placeholders desaparecen
              en cuanto se escribe: sin esto quedan casillas sueltas sin nombre.
              Los anchos deben coincidir con los de los inputs de abajo. */}
          <div className="flex gap-2 items-center text-xs font-medium text-gray-500">
            <span className="flex-1">Descripción materiales</span>
            <span className="w-20 text-right">Cant.</span>
            <span className="w-24 text-right">Precio</span>
            <span className="w-20 text-right">Importe</span>
            <span className="w-8" aria-hidden="true"></span>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-center">
              <input
                className="border rounded px-3 py-2 flex-1"
                placeholder="Descripción materiales"
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
              {/* Igual que las horas: campo de texto con nuestra propia regla.
                  Con type="number", un precio escrito con coma puede quedarse
                  vacío según el navegador y guardarse como 0 sin avisar. */}
              <input
                type="text"
                inputMode="decimal"
                className="border rounded px-3 py-2 w-24"
                placeholder="Precio"
                {...register(`conceptos.${index}.precioUnitario`, {
                  pattern: {
                    value: /^\d*([.,]\d{1,2})?$/,
                    message: 'El precio va en euros, p. ej. 46,50 (máximo 2 decimales)',
                  },
                })}
                onFocus={(e) => e.target.select()}
              />
              {/* Importe de la línea, en vivo */}
              <span className="w-20 text-right text-sm text-gray-600">
                {((Number(conceptos?.[index]?.cantidad) || 0) *
                  numeroDesdeTexto(conceptos?.[index]?.precioUnitario)).toFixed(2)} €
              </span>
              <button type="button" onClick={() => remove(index)}
                className="text-red-600 w-8">
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
              precioUnitario: ''
            })}
            className="text-blue-600 self-start"
          >
            + Añadir material
          </button>
        </fieldset>

        {/* Mano de obra: una línea por tarea, con su tiempo y su tarifa */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">Mano de obra</legend>
          {/* Mismos anchos que los inputs de abajo, para que las columnas cuadren */}
          <div className="flex gap-2 items-center text-xs font-medium text-gray-500">
            <span className="flex-1">Tarea</span>
            <span className="w-24 text-right">Cantidad</span>
            <span className="w-24 text-right">€/hora</span>
            <span className="w-20 text-right">Importe</span>
            <span className="w-8" aria-hidden="true"></span>
          </div>
          {fieldsManoDeObra.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-1">
              <div className="flex gap-2 items-center">
              <input className="border rounded px-3 py-2 flex-1" placeholder="Tarea"
                {...register(`lineasManoDeObra.${index}.descripcion`)}
              />
              {/* Campo de texto, no type="number": así no aparece el spinner (las
                  flechitas) ni el navegador impone sus reglas de step, que
                  rechazaban valores intermedios. inputMode="decimal" saca en el
                  móvil el teclado numérico con la coma.
                  Horas en decimal, con coma o punto y hasta 2 decimales.
                  Vacío se admite y cuenta como 0. */}
              <input type="text" inputMode="decimal"
                className="border rounded px-3 py-2 w-24" placeholder="0,80"
                {...register(`lineasManoDeObra.${index}.horas`, {
                  pattern: {
                    value: /^\d*([.,]\d{1,2})?$/,
                    message: 'Las horas van en decimal, p. ej. 0,80 (máximo 2 decimales)',
                  },
                })}
                onFocus={(e) => e.target.select()}
              />
              <input type="text" inputMode="decimal"
                className="border rounded px-3 py-2 w-24" placeholder="€/hora"
                {...register(`lineasManoDeObra.${index}.precioHora`, {
                  pattern: {
                    value: /^\d*([.,]\d{1,2})?$/,
                    message: 'La tarifa va en euros por hora, p. ej. 46,50 (máximo 2 decimales)',
                  },
                })}
                onFocus={(e) => e.target.select()}
              />
              {/* Importe de esta línea, en vivo */}
              <span className="w-20 text-right text-sm text-gray-600">
                {calcularManoDeObra(
                  numeroDesdeTexto(lineasManoDeObra?.[index]?.horas),
                  numeroDesdeTexto(lineasManoDeObra?.[index]?.precioHora),
                ).toFixed(2)} €
              </span>
              <button type="button" onClick={() => removeManoDeObra(index)}
                className="text-red-600 w-8">
                ✕
              </button>
              </div>
              {/* El error, debajo de SU línea y con el mensaje concreto: con varias
                  tareas, un aviso genérico al final no dice cuál falla. */}
              {(errors.lineasManoDeObra?.[index]?.horas ||
                errors.lineasManoDeObra?.[index]?.precioHora) && (
                <span className="text-red-600 text-sm">
                  {errors.lineasManoDeObra[index].horas?.message ||
                    errors.lineasManoDeObra[index].precioHora?.message}
                </span>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendManoDeObra({
              descripcion: '',
              horas: '',
              // La línea nueva nace con la tarifa del taller ya puesta
              precioHora: Number.isFinite(config?.precioManoDeObra)
                ? config.precioManoDeObra
                : 0,
            })}
            className="text-blue-600 self-start" >
            + Añadir mano de obra
          </button>
          {/* La pista va debajo, junto a los campos, y no arriba del todo */}
          <p className="text-sm text-gray-500">
            La cantidad va en horas decimales: <strong>1</strong> = 1 hora ·
            <strong> 0,50</strong> = media hora · <strong>0,25</strong> = cuarto de hora.
          </p>
        </fieldset>

        {/* IVA */}
        <fieldset className="flex flex-col gap-3 border rounded p-4">
          <legend className="font-semibold px-1">IVA</legend>
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
          {errors.root?.importe && (
            <span className="text-red-600 text-sm self-start">
              {errors.root.importe.message}
            </span>
          )}
          <span>Total materiales: {totalMateriales.toFixed(2)} €</span>
          <span>Total mano de obra: {manoDeObra.toFixed(2)} €</span>
          <span>Base imponible: {baseImponible.toFixed(2)} €</span>
          <span>IVA ({iva}%): {(total - baseImponible).toFixed(2)} €</span>
          <span className="font-bold text-lg">TOTAL: {total.toFixed(2)}
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