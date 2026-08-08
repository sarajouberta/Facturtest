# Facturtest — Registro de cambios

Diario de los cambios hechos en la app, con el **motivo** de cada uno (no solo el qué).
Lo más reciente arriba.

---

## 2026-08-08 — Entrada de números a prueba de errores

Repaso de todos los campos numéricos de la app tras detectar que **`type="number"` no era de
fiar** para importes.

### El problema de `type="number"` con la coma
Con `type="number"`, un valor escrito con **coma decimal** puede dejar el campo **vacío** según
el navegador y su configuración regional. Entonces `valueAsNumber` devuelve `NaN` y el importe
se guarda como **0 sin avisar de nada**. En un precio, eso es una factura mal emitida.

Además, la comprobación de decimales la hacía el navegador vía `step="0.01"`: mensaje en su
idioma, en un globo del sistema, sin poder darle estilo ni encajarlo con el resto de avisos.

**Solución, la misma en los cuatro campos** (precio de material, €/hora de la línea, horas, y el
precio de mano de obra de Configuración):

```jsx
<input type="text" inputMode="decimal"
  {...register(campo, {
    pattern: { value: /^\d*([.,]\d{1,2})?$/, message: '…p. ej. 46,50 (máximo 2 decimales)' },
  })} />
```

- **Coma o punto, indistintamente.** La conversión la hace `numeroDesdeTexto`, necesaria porque
  `Number('46,50')` es `NaN`: JavaScript solo entiende el punto.
- **La regla es nuestra**, así que el mensaje sale en rojo bajo la línea, como los demás.
- `inputMode="decimal"` mantiene el teclado numérico en el móvil, que era lo único bueno que
  aportaba `type="number"`.
- **Km** también se valida (solo dígitos, opcional): antes admitía cualquier texto y se imprimía
  tal cual en la factura.

### Validar antes de convertir, no al revés
La conversión se intentó primero con **`setValueAs`**, que parece lo natural. Está mal:
`setValueAs` se ejecuta **antes** de la validación, así que el `pattern` habría recibido un
número ya convertido — escribir `hola` daría `0`, y `0` encaja con el patrón. **La validación no
habría rechazado nunca nada, en silencio.** La conversión va en `onSubmit`: se valida lo que el
usuario escribió y se convierte después.

### `null` no es `0`
Al vaciar la tarifa en Configuración y guardar, **no saltaba el aviso de campo pendiente**. Dos
causas encadenadas:

1. `numeroDesdeTexto('')` devuelve `0`, así que un campo vaciado se guardaba como un **cero
   válido**. Ahora un campo vacío se guarda como **`null`**: "no hay tarifa" y "la tarifa vale
   cero" son cosas distintas.
2. `estaVacio` trataba el `0` como valor legítimo. Lo era **para el IVA** (un 0 % es real), no
   para una tarifa. Se añade la marca `ceroEsVacio` al campo concreto.

*Lección:* una decisión correcta puede volverse en contra al cambiar el contexto. La regla "el 0
es un valor válido" se escribió pensando en el IVA y solo valía para la mitad de los campos; el
fallo se destapó al pasar el campo de numérico a texto, porque el vacío dejó de ser `NaN`
(detectado) y pasó a ser `0` (no detectado).

### Detalles de presentación
- La tarifa guardada se **formatea al reabrir** Configuración (`46,50`, no `46.5`), con
  `formatearDecimal`. Hay un test de **ida y vuelta** —`numeroDesdeTexto(formatearDecimal(x)) === x`—
  que fija que las dos funciones son inversas: sin eso, abrir y volver a guardar podría degradar
  el número.
- Si no hay tarifa, el campo queda **vacío** (con su placeholder), no a `0,00`: un `0,00` parece
  un dato real y además ocultaría el aviso de campo pendiente.

Tests: de 89 a **107**.

### El botón de exportar PDF, mudo en un móvil concreto
Síntoma: en un teléfono el botón abre el menú de compartir; en otro **no hace nada**, mientras
que Eliminar y Volver sí responden. Mismo código, misma versión, distinto dispositivo.

`exportarPDF` no tenía `try/catch` **ni ninguna señal de estar trabajando**, así que cualquier
fallo se perdía como *rejection* no capturada y la pantalla no se inmutaba. Es el mismo patrón
que dejó el login mudo el 27/07.

Tres causas posibles, y el arreglo cubre las tres:
1. **Lentitud sin aviso.** `html2canvas` con `scale: 2` sobre una hoja de 760 px tarda segundos
   en un móvil modesto. → El botón pasa a mostrar **"Generando PDF…"** y se deshabilita (lo que
   además evita lanzar dos capturas a la vez).
2. **Gesto de usuario consumido.** `navigator.share()` exige llamarse poco después de la
   pulsación, y antes hay dos `await` largos; si el móvil tarda, el navegador rechaza con
   `NotAllowedError`. Explicaría que funcione en un teléfono rápido y no en uno lento. → Si
   compartir falla, **se descarga** con `pdf.save()`, que no depende del gesto. Un `AbortError`
   (el usuario cerró el menú) se ignora en silencio.
3. **`html2canvas` fallando** por memoria o CSS. → `try/catch` con aviso visible y el detalle en
   consola. Si resulta ser esta, el siguiente paso es bajar `scale` a `1.5`.

Lo importante no es adivinar cuál era: es que **el botón deja de estar mudo** y el próximo
intento dirá qué pasa.

---

## 2026-08-07 — Mano de obra desglosada por tareas

Petición del titular del taller tras la **tercera ronda de revisión** de la app: poder fijar el
**precio de la hora** en la configuración y que se rellene solo en cada factura, igual que el
número y el IVA.

### El modelo: una línea por tarea, no un importe suelto

Hasta ahora la mano de obra era **un único campo en euros**, tecleado a mano. "Precio por hora"
es una **tarifa**, no un importe: a 20 €/h, una reparación de tres horas son 60 €, así que
prerrellenar el campo con 20 habría dado una cifra incorrecta salvo que el trabajo durase
exactamente una hora. Se pasa a un **desglose por líneas**:

```js
lineasManoDeObra: [ { descripcion, horas, precioHora } ]
manoDeObra   // el total en €, ya calculado
```

- **Las horas van en decimal** (`1` = 1 h, `0,50` = media, `0,80` = 48 min): la misma unidad al
  escribir, al guardar y al imprimir. Es el formato del sector, verificado contra una factura de
  concesionario donde la columna *Cantidad* dice `0,80` y `0,80 × 46,50 € = 37,20 €`.

  *La unidad dio tres vueltas.* Se empezó en **centésimas de hora** (`100` = 1 h) porque así se
  entendió que lo apuntaba el titular, con conversión `/100` al imprimir; luego se quitó la
  conversión al responder él que el formato `100` también valía para el cliente; y finalmente,
  al ver una factura real, se unificó todo en horas decimales, que es lo que él escribe de
  verdad. **La lección: preguntar por el dato concreto —cómo se escribe frente a cómo se
  imprime— y contrastarlo con un documento real, no con un recuerdo.** El cambio de unidad se
  hizo aprovechando que la función aún no estaba en uso: con facturas ya emitidas habría exigido
  migrar datos o inventar un campo nuevo. El campo pasa a llamarse `horas` (antes `tiempo`),
  y así una línea del formato viejo no puede leerse por error como horas.
- **La tarifa vive en cada línea**, no se lee de la configuración al mostrar la factura. Si
  mañana sube la hora a 25 €, las facturas viejas **no pueden cambiar solas**. Por lo mismo se
  guarda también el importe ya calculado. Y permite cobrar distinto un trabajo especializado.
- La configuración solo aporta el **valor por defecto**: la línea nace con la tarifa puesta,
  pero el campo sigue siendo editable.

### Cálculo (`utils/calculos.js`)
- `calcularManoDeObra(horas, precioHora)` → `horas * precioHora`, por línea.
- `calcularTotalManoDeObra(lineas)` → suma cada línea con **su** tarifa. No vale multiplicar un
  total de horas por una tarifa única.
- Tests: de 46 a **101**, incluidos el caso real del concesionario (`0,80 h × 46,50 € = 37,20 €`)
  y el de la lista inexistente, que es el de las facturas antiguas.

### Fallos encontrados por el camino

- **Las dos secciones compartían estado.** El desglose se había empezado copiando el bloque de
  Materiales, y ambas usaban el **mismo** `useFieldArray` y los mismos nombres de campo. No eran
  dos listas: era la misma pintada dos veces (escribir arriba aparecía abajo, la ✕ borraba de
  las dos). Se arregla con un segundo `useFieldArray` (`name: 'lineasManoDeObra'`), renombrando
  al desestructurar (`fields: fieldsManoDeObra`…) porque los nombres cortos ya estaban ocupados.
- **`ReferenceError` al guardar.** En `crearFactura` se pasaba `precioManoDeObra`, que no existía
  como variable: solo aparecía como **cadena** dentro de un `register(...)`. Los nombres de campo
  de React Hook Form son texto, no variables, y el linter no los revisa. Se activó **`no-undef`**
  en `.oxlintrc.json` para que estos casos salten en `npm run lint`.
- **Se podían emitir dos facturas con el mismo número.** El número se sugiere solo
  (`generarSiguienteNumero`), lo que evita el duplicado en el flujo normal, pero el campo es
  editable y no había **comprobación**: bastaba con corregirlo a mano. La numeración correlativa
  sin duplicados es un requisito legal. Nueva función pura `numeroYaUsado(facturas, numero,
  idActual)`, enganchada como `validate` del campo. Compara como texto normalizado, porque los
  números conviven guardados como número y como texto según cuándo se creó la factura; y admite
  excluir la propia factura, de cara a poder editarlas en el futuro.
- **La fecha se podía dejar vacía** (el valor por defecto solo rellena, no impide borrar) → ahora
  es `required`.
- **La fecha por defecto se calculaba en UTC.** `new Date().toISOString()` daba el **día
  anterior** entre medianoche y las 2:00 en horario español. Se cambia por
  `toLocaleDateString('sv-SE')`, el único locale estándar que da `AAAA-MM-DD` —el formato que
  necesita `<input type="date">`— pero en la zona horaria del dispositivo.
- **El efecto de valores sugeridos se repetía.** Se dispara con cada cambio de `facturas` o
  `config`, y ambos llegan por `onSnapshot`: una factura guardada desde el móvil podía
  **sobrescribir** el número o el IVA que se estuviera escribiendo. Ahora se aplica una sola vez
  con una bandera en `useRef` (no `useState`: cambiarla no debe repintar).

### Formularios más claros
- **Cabecera de columnas** en Materiales y en Mano de obra. Los *placeholders* desaparecen al
  escribir, así que sin títulos quedaban casillas sin nombre — y con una notación de tiempo poco común
  eso era directamente indescifrable. Importe por línea en vivo, en ambas secciones.
- **El campo de horas es de texto**, no `type="number"`: sin *spinner*, y sin las reglas de `step`
  del navegador, que rechazaban valores intermedios. La validación la ponemos nosotros con
  `pattern: /^\d*([.,]\d{1,2})?$/` (decimal, coma o punto, dos decimales como mucho), e
  `inputMode="decimal"` saca el teclado numérico en el móvil.
- **El precio de material arranca vacío**, no a `0`. Ese `0` era el valor real del campo y había
  que borrarlo para escribir encima (en julio se paliaba seleccionando al enfocar).
- Campos obligatorios **en negrita**, además del asterisco. Y los cinco campos que solo tenían
  *placeholder* (matrícula, marca, modelo, nombre, DNI) pasan a tener **etiqueta de verdad**:
  el nombre desaparecía al escribir, justo cuando hace falta. Regla que queda fijada: **la
  etiqueta es el nombre, el placeholder es un ejemplo**.
- **Los errores se ven al salir del campo**, no solo al pulsar Guardar: `mode: 'onTouched'` en
  `useForm`. Y en las líneas de mano de obra el mensaje sale **debajo de su fila**, con el texto
  concreto; antes había un aviso genérico al final de la sección que, con varias tareas, no
  decía cuál fallaba.

### El fallo de la coma
Al pasar las horas a decimal, el importe de cada línea se veía bien pero **el total se quedaba a
0**. Causa: había dos caminos para el mismo dato. El importe por línea pasaba por
`numeroDesdeTexto`, mientras que el total llamaba a `calcularTotalManoDeObra` con el texto crudo,
y **`Number('0,5')` es `NaN`**. Con punto funcionaba; con coma, no.

Arreglado haciendo que el total en vivo use `limpiarLineasManoDeObra`, **la misma función que al
guardar**: además de resolver la coma, garantiza que lo que se ve y lo que se graba salgan de la
misma tubería. Las facturas guardadas nunca estuvieron mal —`onSubmit` ya usaba la función
correcta—, solo la previsualización.

### `NaN`, el tema recurrente
`valueAsNumber` devuelve **`NaN`** —no `0` ni `undefined`— cuando un campo numérico está vacío, y
un `??` no lo caza. Se ataja en tres capas: `Number(x) || 0` al calcular, `Number.isFinite(x)` al
leer la configuración, y una **normalización antes de guardar** (`utils/lineas.js`), para que el
dato escrito en Firestore no quede sucio.

### Líneas vacías (`utils/lineas.js`)
El formulario arranca siempre con una línea de cada tipo. Si no se rellenaba ni se borraba, se
guardaba tal cual y salía en la factura como una **fila en blanco con importes a 0** — fue lo que
despistó al revisar una factura de prueba antigua.

`limpiarConceptos` y `limpiarLineasManoDeObra` normalizan los números y **descartan las líneas
vacías** antes de guardar. Qué cuenta como vacía:

- **Material:** sin descripción **ni** precio. La *cantidad* no sirve de señal: viene con un `1`
  por defecto que no significa que nadie haya escrito nada.
- **Mano de obra:** sin tarea **ni** horas. La *tarifa* tampoco sirve de señal: desde este
  cambio la línea nace con el precio de la configuración ya puesto, así que usarla habría
  impedido descartar ninguna.

Los totales se calculan ya sobre las líneas limpias, que son las que se guardan, para que lo
mostrado y lo almacenado no puedan divergir. La normalización, que antes estaba suelta dentro de
`onSubmit`, queda aquí **con tests**.

### Tablas que solo aparecen si tienen contenido
La tabla de materiales se pintaba **siempre**, mientras que la de mano de obra ya iba condicionada.
En una factura de solo mano de obra —perfectamente válida— eso dejaba una cabecera suelta sin
filas. Ahora ambas van bajo `?.length > 0`.

Conviene no confundirlo con la regla de negocio: **una impide guardar** una factura que no sume
nada; **la otra impide enseñar** una tabla sin contenido en una factura correcta. Son
complementarias.

### Aviso de configuración incompleta
La configuración **envejece**: al añadir campos nuevos, las configuraciones ya guardadas se
quedan sin ellos y el onboarding no lo detecta (solo salta cuando *no hay* configuración). Con la
tarifa vacía, las líneas nacían a `0` sin avisar.

- `utils/configuracion.js`: `clavesConfigPendientes` y `camposConfigPendientes`, funciones puras
  con tests. Un `0` **no** cuenta como hueco (un IVA del 0 % es válido); `NaN`, `null` y `''` sí.
  Ambas salen de la misma lista, así que el aviso y el campo señalado no pueden contradecirse.
- Aviso en **Nueva factura** (donde el hueco hace daño) y en **Configuración**, con los campos
  que faltan **en rojo**. Informa pero **no bloquea**: obligar a rellenar un campo que antes no
  existía sería castigar al usuario por un cambio nuestro.
- Confirmación **en página** al guardar (verde, en el sitio del aviso amarillo), además del
  `alert` de siempre.

### Documentación y limpieza
- README de verdad (era la plantilla de Vite), `lang="es"` en `index.html`, fuera Dexie de
  `package.json` (ya no lo importaba nadie) y los assets muertos. Quitar Dexie **no reduce el
  bundle**: Vite ya lo descartaba por *tree-shaking*; la ganancia es de repo, no de rendimiento.
- `tecnologias.md` al día: modelo de datos con `lineasManoDeObra` y la política de
  **no migrar nunca** las facturas antiguas (se detecta la ausencia del campo y se muestra lo
  que haya).

---

## 2026-08-06 — Reglas de seguridad de Firestore (Fase 5)

La base llevaba desde el 13 de julio **en modo de prueba**, es decir, abierta. Se cierra.

### El punto de partida: dos problemas en una sola regla

```js
match /{document=**} {
  allow read, write: if request.time < timestamp.date(2026, 8, 12);
}
```

1. **Abierta a cualquiera, hoy.** El `match` es la **raíz** (`/{document=**}` = toda la base) y
   la única condición es **la fecha**: no se menciona `request.auth`, así que **ni siquiera hace
   falta estar logueado**. Con el `projectId` (que viaja en el bundle y es público por diseño)
   cualquiera podía leer o borrar las facturas usando la **API REST** de Firestore, sin pasar
   por la app.
2. **Cerrada del todo a partir del 12 de agosto.** Es la caducidad de 30 días del modo prueba.
   Al vencer, la condición deja de cumplirse y Firestore **deniega todo**. Peor aún: la app no
   avisa, simplemente se queda sin datos (lista vacía, config sin cargar) y el error solo se ve
   en la consola del navegador.

### Las reglas nuevas (`firestore.rules`, en la raíz del repo)

```js
match /users/{uid}/{documento=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

- El `match` deja de ser la raíz y pasa a ser **la rama de un usuario**. `{documento=**}` es un
  comodín **recursivo**: cubre `facturas/{id}`, `config/taller` y cualquier subcolección futura.
- La condición pasa de una fecha a **la identidad**: hay sesión **y** el uid del token coincide
  con el de la ruta. `request.auth` lo rellena Firebase tras validar el token de Google, así que
  **el cliente no puede falsearlo**.
- Desaparece la caducidad: no hace falta fecha límite cuando la regla es correcta de por sí.
- Lo que no se permite explícitamente queda **denegado por defecto**; no hay que escribirlo.

**El archivo del repo no protege nada por sí solo:** es la fuente de la verdad para el
histórico, pero las reglas que se aplican son las **publicadas** en la consola de Firebase.
Mismo patrón que las variables `VITE_*` y que el `sw.js`: lo que hay en el repo y lo que hay en
producción son cosas distintas hasta que se despliega.

### Verificación

**1. Que no estorban (recorrido por la app, en ventana de incógnito).** Las seis operaciones de
`datos.js` en verde y sin errores en consola: *list*, *get*, *create*, *write* de config y
*delete*.

- *Por qué en incógnito:* con `persistentLocalCache` activo, Firestore sirve la copia local del
  dispositivo, así que la app **puede parecer que funciona sin haber hablado con el servidor**.
  En incógnito la caché está vacía → si los datos aparecen, han venido del servidor y han
  atravesado las reglas. (De hecho el primer intento salió contaminado: una extensión del
  navegador bloqueaba `firestore.googleapis.com` con `ERR_BLOCKED_BY_CLIENT` — que es
  *"cancelado por tu propio navegador"*, no un rechazo del servidor — y las facturas que se
  veían salían de la caché.)

**2. Que sí protegen (API REST, sin credenciales).** Es la prueba de verdad: peticiones reales
contra la base de producción, sin token, que es justo lo que haría un curioso.

```
GET  /v1/projects/facturtest-6b96e/databases/(default)/documents/users/xyz/facturas    → 403
GET  …/users/xyz/config/taller                                                         → 403
POST …/users/xyz/facturas                                                              → 403
```

Las tres devuelven `PERMISSION_DENIED`. **Con las reglas viejas, estas mismas peticiones habrían
devuelto los datos.** Mejor prueba que el *Rules Playground* de la consola, que solo simula.

**3. Que aíslan a un usuario de otro (segunda cuenta de Google).** La prueba 2 solo cubre
`request.auth != null`; para la otra mitad de la condición (`request.auth.uid == uid`) hace
falta un token real de otra cuenta. Al entrar con una segunda cuenta, la app muestra el
**onboarding de primer uso** — es decir, esa cuenta cae en **su propia rama, vacía**, sin ver ni
las facturas ni la configuración de la primera. Las dos mitades de la regla quedan verificadas.

### Pendiente
- **Emulator Suite** (`firebase-tools` + `@firebase/rules-unit-testing`): permitiría convertir
  estas comprobaciones en **tests automáticos de las reglas**, ejecutables junto a los de
  Vitest. Queda en mejoras futuras. Nota: el emulador prueba el **archivo local**, no lo
  publicado.
- Las reglas controlan **quién** escribe, no **qué** escribe: un dueño autenticado puede guardar
  en su rama un documento con cualquier forma. Validar la forma de la factura encaja mejor
  cuando se implemente *editar factura*.

---

## 2026-08-06 — El login en el móvil: tres fallos encadenados

El arreglo del 27 de julio (redirección + proxy) se había subido pero **nunca se llegó a
verificar en el móvil**. Al comprobarlo aparecieron **tres fallos encadenados**: uno de
despliegue, uno de la propia PWA y uno de configuración de Google Cloud. Cada uno tapaba al
siguiente, así que solo se veían de uno en uno.

### Fallo 1: el `authDomain` nuevo no estaba en producción

El proxy de `vercel.json` funcionaba (pedir `/__/auth/handler` al sitio publicado devolvía el
manejador real de Firebase, no el `index.html`), pero en el **bundle desplegado** el
`authDomain` compilado seguía siendo `facturtest-6b96e.firebaseapp.com` en vez de
`facturtest.vercel.app`. Sin esa mitad, el proxy no sirve de nada: la redirección seguía
saliendo por el dominio de Firebase y volvía al problema de las cookies de terceros.

- *Causa:* las variables **`VITE_*` no se leen en tiempo de ejecución**: Vite las **incrusta
  en el código durante el `build`**. Cambiar la variable en el panel de Vercel no toca el
  sitio ya publicado — solo afecta al **siguiente** build.
- *Arreglo:* poner `VITE_FIREBASE_AUTH_DOMAIN=facturtest.vercel.app` en Vercel (Production) y
  **redesplegar sin caché de build**. En `.env.local` se deja `…firebaseapp.com`, porque en
  local se trabaja en el navegador de escritorio, donde el popup funciona y no hay proxy.
- *Es el mismo mecanismo* que la pantalla en blanco del 17 de julio. Regla a recordar:
  **tocar una variable de entorno en Vercel exige redeploy.**

### Fallo 2: el service worker interceptaba la ruta de login

Con el `authDomain` ya correcto, en el móvil el botón **"Entrar con Google" dejaba la pantalla
en "Cargando…"** y no aparecía nunca el selector de cuenta de Google.

- *Causa:* el service worker se genera con `navigateFallback: index.html` — *"ante cualquier
  navegación dentro de mi dominio, sirve el `index.html` cacheado"*. Es justo lo que hace que
  la app funcione sin conexión y que `/factura/7` no dé 404. **Pero el arreglo del proxy había
  movido el login al dominio propio** (`facturtest.vercel.app/__/auth/…`), metiéndolo dentro
  del radio de acción del service worker. Secuencia: `signInWithRedirect` navega a
  `/__/auth/handler` → el service worker responde con el `index.html` cacheado → la app vuelve
  a arrancar, ahora en la URL del handler y sin sesión → `cargando` se queda en `true` para
  siempre. **Nunca se llegaba a Google.**
- *Por qué costó verlo:* con `curl` funcionaba (curl no tiene service worker) y en el navegador
  de escritorio también (usa popup, que va a `accounts.google.com` — dominio ajeno, fuera del
  alcance del service worker). El fallo solo se daba en la **PWA instalada**.
- *Ironía:* el arreglo del proxy funcionó *demasiado* bien. Al traer el login al dominio propio,
  lo puso bajo la jurisdicción del service worker.

**El arreglo (`vite.config.js`):** un bloque `workbox` con la lista de excepciones a esa regla.

```js
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    // El service worker NO debe secuestrar las rutas de login de Firebase:
    // si responde con el index.html cacheado, la redirección nunca llega a Google.
    navigateFallbackDenylist: [/^\/__\/auth\//],
  },
  manifest: { /* … */ },
})
```

`navigateFallbackDenylist` es una lista de expresiones regulares: las rutas que casen quedan
**excluidas** de la regla del `index.html` y salen a la red, donde el proxy de Vercel las lleva
a Firebase. Explicación conceptual de service worker y Workbox en `tecnologias.md`.

### Verificación (en el sitio publicado)
- `authDomain` compilado en el bundle = `facturtest.vercel.app`, y **cero** apariciones de
  `firebaseapp.com`.
- `/__/auth/handler` devuelve el HTML del manejador de Firebase (con `handler.js`), no el
  `index.html` de la app.
- `sw.js` de producción contiene `denylist:[/^\/__\/auth\//]`.

### Fallo 3: Google no conocía el dominio nuevo (`Error 400: redirect_uri_mismatch`)

Con el service worker ya fuera de en medio, la redirección **sí llegó a Google**… y Google la
paró en seco: pantalla de **"Acceso bloqueado"**, `Error 400: redirect_uri_mismatch`.

- *Causa:* al pasar el `authDomain` al dominio propio, la URL de retorno del login pasó a ser
  `https://facturtest.vercel.app/__/auth/handler`. Google solo acepta volver a direcciones
  **declaradas de antemano** en el cliente OAuth, y ahí solo estaba la que Firebase registra
  sola (`…firebaseapp.com/__/auth/handler`). **Firebase no sabe nada del dominio de Vercel.**
- *Arreglo:* Google Cloud Console (mismo proyecto `facturtest-6b96e`) → **APIs y servicios →
  Credenciales** → cliente *Web client (auto created by Google Service)*, y añadir:
  - **Orígenes autorizados de JavaScript:** `https://facturtest.vercel.app` (sin ruta)
  - **URIs de redireccionamiento autorizados:** `https://facturtest.vercel.app/__/auth/handler`
- *Distinción entre los dos campos:* el **origen** es desde qué web se permite **arrancar** el
  login; el **URI de redireccionamiento**, a qué dirección exacta se permite **volver** con el
  resultado. El proxy cambió las dos cosas a la vez.
- *Detalle que costó tiempo:* el proyecto **no aparecía** en Google Cloud. No era un problema de
  permisos: el selector solo muestra los proyectos de la **cuenta de Google activa**, y el
  navegador se había quedado con la segunda cuenta usada para probar el aislamiento de
  Firestore. Atajo para saltarse el selector:
  `console.cloud.google.com/apis/credentials?project=facturtest-6b96e`.
- Google avisa de que estos cambios **tardan en propagarse** (de minutos a horas). Un fallo
  inmediato tras guardar no significa que esté mal puesto.

### El mapa completo: mover el login al dominio propio toca TRES sitios

Esta es la lección de la sesión. El arreglo de julio hizo dos de los tres y por eso quedó a
medias:

| Dónde | Qué se declara | Estado |
|---|---|---|
| `vercel.json` | El proxy `/__/auth/*` → proyecto de Firebase | ✅ 27/07 |
| Firebase → Authentication → **Authorized domains** | Que el dominio puede usar Firebase Auth | ✅ 27/07 |
| Google Cloud → **Credenciales → cliente OAuth** | Origen y URI de retorno permitidos por Google | ✅ 06/08 |

Y a esos tres hay que sumar los dos de dentro de la app, que también hablan de rutas: la
variable `VITE_FIREBASE_AUTH_DOMAIN` (Vercel) y la `navigateFallbackDenylist` del service
worker. **Cinco sitios en total** para una sola decisión de arquitectura.

### Resultado

**Login verificado en el móvil real (PWA instalada): entra correctamente.** Queda cerrado el
arreglo que se abrió el 27/07 y con él la sincronización multi-dispositivo, que era su motivo.

### Nota operativa
Tras cambiar la configuración de la PWA hay que **desinstalar y reinstalar la app en el móvil**.
El service worker viejo sigue instalado con la regla antigua y no se reemplaza de forma fiable
él solo (ver *ciclo de vida* en `tecnologias.md`).

---

## 2026-07-27 — Login con Google roto en el móvil (PWA)

Síntoma: en el móvil, al pulsar **"Entrar con Google"** no pasaba **nada**. La app está
instalada como **PWA en modo `standalone`** (`vite.config.js`), y en ese modo el navegador
**no deja abrir el popup** de `signInWithPopup`: la promesa se rechaza. Como el botón llamaba
a `entrar` **sin `.catch`** (`onClick={entrar}` con `entrar = () => signInWithPopup(...)`), el
error se perdía como *rejection* no capturada y el usuario no veía nada.

### El arreglo (`src/auth/AuthContext.jsx`)
- **PWA / standalone → `signInWithRedirect`.** Se detecta el modo con
  `matchMedia('(display-mode: standalone)')` (Android/escritorio) y `navigator.standalone`
  (iOS). En standalone se va directo a **redirección de página completa**, que sí funciona.
- **Navegador → sigue con popup**, pero con **respaldo**: si el popup está bloqueado o no se
  soporta (`auth/popup-blocked`, `auth/cancelled-popup-request`,
  `auth/operation-not-supported-in-this-environment`), **cae automáticamente a redirección**.
  Si el usuario cierra el popup a propósito (`auth/popup-closed-by-user`), no se molesta.
- **`getRedirectResult(auth)` al arrancar** (en el `useEffect`): recoge el resultado al volver
  de Google y, sobre todo, **avisa con un `alert`** si algo falla, en vez de quedarse mudo.
- `entrar` pasa a ser **`async`** con su propio `try/catch`, así el `onClick` ya no deja
  *rejections* sueltas.

### Segunda parte: la redirección volvía SIN sesión (cookies de terceros)
Tras el arreglo anterior, en el móvil ya salía el selector de cuenta de Google, pero al
volver **no quedaba logueado**: te devolvía al mismo punto. Causa: el **particionado de
almacenamiento / bloqueo de cookies de terceros** de los navegadores modernos (Chrome 115+,
Safari/iOS). La credencial se guarda contra el dominio `firebaseapp.com` en un contexto
particionado, así que `getRedirectResult` no la recupera.

Solución oficial de Firebase (*redirect best practices*): **servir el manejador de login
desde el propio dominio** para que no haya cookies de terceros.
- **Proxy en `vercel.json`:** `/__/auth/:path*` se reenvía a
  `https://facturtest-6b96e.firebaseapp.com/__/auth/:path*`. Para el navegador todo ocurre en
  `facturtest.vercel.app`; Vercel hace de intermediario por detrás.
- **`authDomain` pasa a `facturtest.vercel.app`** (el dominio propio) en la variable de
  entorno **`VITE_FIREBASE_AUTH_DOMAIN` de Vercel (Production)**. En **local** se deja
  `facturtest-6b96e.firebaseapp.com` (`.env.local`), donde el popup funciona en el navegador
  de escritorio; el proxy solo hace falta en producción.

### Pendiente de verificar al desplegar
- El **dominio de Vercel** debe estar en **Firebase → Authentication → Authorized domains**
  (hecho).
- La redirección solo se puede probar en el **móvil real** tras el redeploy (no en local).

---

## 2026-07-17 — Manejo de errores (evitar pantallas en blanco)

Raíz del susto: la app **publicada** salió en blanco porque faltaban las claves de Firebase
en Vercel (`.env.local` no se sube a git). Se solucionó añadiéndolas en Vercel (Environment
Variables, Production) + redeploy + limpiar el caché de la PWA. Para que un fallo así no vuelva
a dejar una pantalla muda, se añaden **redes de seguridad**:

- **Error Boundary** (`src/components/ErrorBoundary.jsx`): captura errores AL RENDERIZAR y
  muestra "Algo ha ido mal" con botón de recargar, en vez de un blanco. Es un componente de
  **clase** (React solo permite capturar errores de render con `getDerivedStateFromError` /
  `componentDidCatch`, no hay equivalente con hooks). Envuelve la app en `main.jsx`.
- **Mensaje de respaldo en `index.html`**: cubre los fallos **al arrancar** (imports que
  petan, como el de hoy), que el Error Boundary NO ve porque React aún no se ha montado. Es
  HTML con estilos en línea dentro de `#root`; React lo reemplaza al montar.
- **Avisos al guardar/borrar** (`NuevaFactura`, `DetalleFactura`, `Configuracion`):
  `crearFactura`, `borrarFactura` y `guardarConfig` van en `try/catch` con un `alert` claro;
  antes el error solo se escribía en consola y el usuario no se enteraba.

---

## 2026-07-17 — Cliente/vehículo recurrente y afinado de búsqueda y formulario

### Cliente recurrente (por matrícula)
- En "Nueva factura", al salir del campo **matrícula** (`onBlur`), se busca si ese vehículo
  ya existe en facturas anteriores. Si lo hay, aparece un aviso *"🚗 Este vehículo ya está:
  [cliente]. ¿Rellenar sus datos?"* con un botón que **autocompleta cliente + marca/modelo**
  (no la matrícula ni los km, que cambian).
  - *Por qué la matrícula como clave:* es el identificador único del coche, sin las erratas
    ni duplicados de un nombre. Se coge la factura **más reciente** por si el coche cambió de
    dueño (con `buscarPorMatricula`, función pura en `utils/busqueda.js`, con tests).
  - *Detalle técnico:* el `onBlur` del `register` de RHF se **encadena** con nuestra búsqueda
    (se llama a los dos) para no pisar la validación. El botón es `type="button"` para no
    enviar el formulario.

### La búsqueda pasa a ser SOLO por matrícula
- Antes la caja buscaba en nº de factura **y** matrícula, lo que solapaba resultados con datos
  cortos (buscar "1" sacaba facturas por su **número**, no por la matrícula). Se quita el
  número de la búsqueda: la caja busca **solo matrícula**, que es lo que de verdad se usa.
- La **lista muestra ahora la matrícula** en cada línea (`cliente · matrícula · fecha`), para
  que se vea por qué una factura coincide.

### Orden y etiquetas del formulario
- El bloque **Vehículo** se sube **encima de Cliente**, y dentro la **matrícula va primero**:
  así el flujo es número → fecha → matrícula → (reconoce el coche) → se rellena lo de abajo.
- El campo "Vehículo" pasa a llamarse **"Marca"** (que es lo que era).
- **Campos obligatorios marcados con `*`** (factura y configuración) + nota "Los campos con *
  son obligatorios".

---

## 2026-07-16 — Búsqueda y filtros de facturas + mejoras de formularios

### Búsqueda y filtros (`ListaFacturas.jsx`)
- Caja de texto que filtra **en vivo** por **nº de factura o matrícula** (se descartó
  buscar por cliente: no hacía falta). Placeholder con ejemplo de formato.
- Dos desplegables **Año** y **Mes** (con opción "todos"). El de Año se rellena solo con
  los años presentes en las facturas. Los tres criterios se combinan con **Y**.
  - *Por qué desplegables y no un selector de mes único:* se quería poder ver "todo un año"
    o "un mes suelto" de forma independiente ("año **o** mes").

### Matrícula normalizada
- Al **guardar** una factura, la matrícula se limpia: **MAYÚSCULAS y sin espacios ni
  guiones** (`1234 abc` → `1234ABC`), así en la factura sale siempre uniforme.
- Al **buscar**, se compara con la misma limpieza, de modo que da igual espacios, guiones o
  mayúsculas. Es **agnóstico al formato**: vale para matrículas nuevas (`1234 BCD`) y
  antiguas (`M-1234-AB`), porque no valida el patrón, solo quita separadores.

### Lógica extraída a `src/utils/` (para poder testear)
- `matricula.js`: `matriculaParaGuardar` y `normalizarMatricula`.
- `busqueda.js`: `filtrarFacturas(facturas, { texto, anio, mes })` (función pura).
  - *Por qué:* la lógica estaba dentro del componente y no se podía testear; sacarla la hace
    testeable y reutilizable, siguiendo el patrón de los demás `utils`.

### Usabilidad de los formularios
- **Placeholders con ejemplo de formato** en los campos donde el formato importa: matrícula,
  DNI/CIF y teléfono (factura), y nº inicial, NIF, actividad, dirección y teléfono
  (configuración). Se dejaron sin ejemplo "nombre comercial" y "titular" (texto libre).
- El campo **"Número inicial de factura"** ahora **se selecciona al enfocarlo**
  (`onFocus`), igual que los importes de la factura: al teclear se reemplaza el valor sin
  borrarlo a mano.

### Tests
- Nuevos `matricula.test.js` y `busqueda.test.js`. Uno documenta a propósito por qué un
  dígito corto como "1" saca varias facturas (coincide con el número **y/o** la matrícula):
  es comportamiento esperado, no un fallo. El proyecto pasa a **42 tests en verde**.

---

## 2026-07-16 — Bug: "Cargando…" eterno tras el login sin config

Al entrar con Google **habiendo borrado la config del taller**, la app se quedaba clavada en
`Cargando…` bajo el usuario, en vez de redirigir al onboarding (`/configuracion`).

### La causa: `==` en vez de `===`
En `ListaFacturas.jsx` la lógica de estados era correcta, pero la primera guarda usaba
igualdad **débil** (`==`):

```js
if (facturas === undefined || config == undefined) return <p>Cargando…</p>  // ❌
if (config === null) return <Navigate to="/configuracion" replace />
```

El hook `useConfig` distingue bien tres estados: `undefined` = cargando, `null` = cargó pero
no hay config, objeto = hay config. El fallo es que **`null == undefined` es `true`** en JS
(regla especial de la coerción del `==`). Así que con la config borrada (`config === null`),
la línea del `Cargando…` lo capturaba y **nunca se llegaba** al `Navigate` → el redirect al
onboarding era código muerto.

### El arreglo
Un solo carácter: `==` → `===`.

```js
if (facturas === undefined || config === undefined) return <p>Cargando…</p>  // ✅
```

Con `===`, `null === undefined` es `false`, así que un `config` en `null` ya no cae en
"Cargando…" y pasa al `Navigate`.

### Lección: `==` vs `===`
- `===` (estricta): compara **valor y tipo**; si los tipos difieren, `false`. No convierte.
- `==` (débil): **convierte** los tipos antes de comparar → sorpresas
  (`1 == '1'`, `0 == false`, `'' == false`, `null == undefined`… todas `true`).
- *Regla:* usar **siempre `===`/`!==`**. Única excepción idiomática y deliberada:
  `x == null` para cubrir `null` **o** `undefined` a propósito.
- *Pendiente:* revisar el `oxlint` para que avise de los `==` accidentales.

---

## 2026-07-13 — Sincronización multi-dispositivo con Firebase (Fases 1-3)

Mejora pedida por el titular del taller: poder usar la app en el **móvil y en el escritorio
con los mismos datos** (hoy cada dispositivo tiene su propia IndexedDB aislada). Requisitos:
**gratis** y ligado a la **cuenta de Google**.

### Decisión de arquitectura: Firebase (no Google Drive)
- Se elige **Firebase** (Firestore + Authentication con Google), plan **Spark (gratuito)**.
  - *Por qué frente a Drive:* pensando en un posible salto futuro a **app nativa / Play
    Store**, con Firebase la **capa de datos no cambia** (Firestore tiene SDK nativo); solo
    se repintaría la interfaz. Con Drive habría que reimplementar el sync en nativo.
  - *Modelo de sync:* como en la práctica hay **un solo editor** (el padre, casi siempre en
    el móvil; el escritorio es para ver/copia), NO hace falta sync bidireccional con
    conflictos: basta "última escritura gana". Esto absorbe el pendiente de *backup*.

### Fase 1 — Proyecto en la consola de Firebase (sin código)
- Proyecto `facturtest-6b96e`. Activados **Firestore** (BD `(default)`, en modo de prueba,
  temporal) y **Authentication** con proveedor **Google**. Registrada la app web.

### Fase 2 — SDK e inicialización
- `npm install firebase` (v12) y nuevo **`src/firebase.js`**: inicializa Firebase una vez y
  exporta `auth`, `googleProvider` y `firestore`.
  - *Detalle de nombres:* la BD de Firebase se exporta como **`firestore`**, no `db`, para no
    chocar con el `db` de Dexie (`src/db.js`).
  - *Claves:* en **`.env.local`** (ignorado por git vía `*.local`) con prefijo **`VITE_`**
    (Vite solo expone al navegador las variables con ese prefijo). Plantilla documentada en
    **`.env.example`**. Las claves web de Firebase no son secretas, pero se centralizan así.

### Fase 3 — Login con Google
- **`src/auth/AuthContext.jsx`**: Context de React con el hook `useAuth`. Escucha
  `onAuthStateChanged` (Firebase avisa de cada cambio de sesión, también al recargar) y
  expone `usuario`, `entrar()` (`signInWithPopup`) y `salir()` (`signOut`).
  - *Por qué un Context:* "quién está logueado" lo necesitan muchos componentes; centralizarlo
    evita pasar props en cascada.
  - *Limpieza:* el `useEffect` devuelve la función de desuscripción de `onAuthStateChanged`
    para no dejar fugas.
- Envuelto en `main.jsx` (`<AuthProvider>`) y botón **entrar/salir** en la cabecera de
  `App.jsx`. La app **aún no se bloquea** tras el login (se decidirá en la Fase 4).

### Pendiente (próximas fases)
- **Fase 4:** capa de datos — decidir **sustituir Dexie por Firestore** (offline integrado →
  sync en tiempo real casi gratis) vs. mantener ambos. Es la fase que más código toca.
- **Fase 5:** reglas de seguridad de Firestore (cada usuario solo ve sus datos; hoy está en
  modo de prueba, abierto).
- **Fase 6:** probar en dos dispositivos reales.
- **Para el deploy:** añadir las 6 variables `VITE_FIREBASE_*` en Vercel; añadir el dominio de
  Vercel en Firebase → Authentication → Authorized domains; en móvil quizá cambiar
  `signInWithPopup` por `signInWithRedirect`. El bundle creció a ~1,5 MB por el SDK
  (candidato a code-splitting).

---

## 2026-07-13 — Número inicial de factura configurable

Mejora pedida por el titular del taller tras probar la app: poder **fijar desde qué número
empieza a facturar**, para enlazar con la numeración de su talonario de papel.

### 1. Numeración corrida y solo numérica
- El formato pasa de `F-2026-001` a un **número pelado** (`46`, `47`…). Se elimina el prefijo
  y el año.
  - *Por qué:* el taller numera sus facturas solo con dígitos, sin prefijos. Además, al
    quitar el año desaparece un caso raro de cambio de ejercicio (2026 → 2027).
- `generarSiguienteNumero(facturas, numeroInicial)`: nueva firma. El siguiente número es
  `Math.max(correlativoReal + 1, numeroInicial)`.
  - *Cómo funciona:* el número inicial solo manda **mientras nadie lo haya superado**; en
    cuanto existe una factura más alta, gana el correlativo real de la base de datos.
  - `parseInt` + descarte de `NaN`: una factura antigua con el formato viejo (`F-2026-001`)
    no rompe el cálculo, simplemente no cuenta.

### 2. Campo "Número inicial de factura" en Configuración
- Nuevo `<input type="number">` (`numeroInicial`, con `valueAsNumber`), el primero del
  formulario. No es obligatorio: si se deja vacío, la numeración arranca en `1`.

### 3. `NuevaFactura` lee la config
- El `useEffect` que sugiere el número pasa a cargar **facturas y config a la vez**
  (`Promise.all`) y pasa `config?.numeroInicial` a la función. El input del número pasa a
  `type="number"`. El campo sigue siendo **editable** a mano.

### 4. Tests
- `numeracion.test.js` reescrito para la nueva firma (6 casos: arranque desde el inicial,
  correlativo normal, huecos, formato antiguo ignorado). El proyecto sigue en **28 tests**.

### Nota pendiente
- El comentario de `validaciones.js` (línea 3) dice que un CIF `B1234567` (8 caracteres) es
  válido, pero la regex exige 9. Despiste del comentario, a cuadrar al subir el NIF a nivel B.

---

## 2026-07-08 — Usabilidad, validación y limpieza del historial de Git

Sesión centrada en pulir cosas detectadas **usando la app de verdad** (ya instalada y
probada offline en el móvil) y en dejar los formularios a prueba de datos incorrectos.

### 1. PWA verificada (sin cambios de código)
- Se comprobó que la app **funciona sin conexión** (modo avión en el móvil): carga, guarda
  facturas y genera el PDF.
- **Por qué importa:** es una app para un taller, donde la cobertura puede ser mala. El
  service worker cachea el "app shell" y los datos viven en Dexie (IndexedDB, local), así
  que no depende de internet. La PWA queda dada por cerrada.

### 2. Usabilidad
- **Redirección tras el onboarding** (`Configuracion.jsx`): al guardar los datos del taller
  **por primera vez**, la app lleva directa a la pantalla principal (Facturas). Si entras a
  editar la config más tarde, se queda (muestra el aviso de guardado).
  - *Por qué:* al terminar la configuración inicial lo natural es empezar a facturar, no
    quedarse en el formulario. Se usa `useNavigate`, condicionado a `primeraVez`.
- **El `0` de los campos numéricos** (`NuevaFactura.jsx`): al pulsar un campo de importe, su
  contenido se **selecciona** (`onFocus={(e) => e.target.select()}`), de modo que al teclear
  se reemplaza sin tener que borrar el `0`/`1`/`21` a mano.
  - *Por qué:* ese `0` no era un placeholder, era el **valor real** del campo. Vaciarlo a `''`
    habría metido `NaN` en los cálculos; seleccionar al enfocar es la solución limpia y no
    toca la lógica.

### 3. Validación de los formularios (React Hook Form)
Antes se podía guardar una factura vacía o con datos imposibles. Ahora RHF **bloquea el
guardado** y marca en rojo el campo cuando algo falla.

- **Campos obligatorios** (factura): número, cliente (nombre y DNI/CIF) y vehículo (marca,
  modelo y matrícula; los km quedan opcionales).
  - *Por qué el vehículo:* es la factura de un taller; sin coche identificado (sobre todo la
    **matrícula**) la factura no dice a qué reparación corresponde.
- **Valores correctos:** cantidad ≥ 1, precio y mano de obra no negativos, IVA entre 0 y 100.
- **Formato de NIF y teléfono:** nueva utilidad reutilizable `src/utils/validaciones.js`
  (`nifValido`, `telefonoValido`), importada tanto en la factura (cliente) como en
  Configuración (taller). Nivel A: comprueba la **forma** (DNI/NIE/CIF, 9 cifras), no el
  dígito de control. El teléfono es opcional pero, si se rellena, debe ser válido.
  - *Por qué una utilidad aparte:* las mismas reglas viven en dos formularios; centralizarlas
    evita duplicar las expresiones regulares y permite testearlas. El NIF del taller pasó a
    ser **obligatorio** (una factura legalmente debe llevar el NIF del emisor).
- **Regla de negocio:** la factura no puede sumar 0 € — debe tener piezas **o** mano de obra.
  Se valida en `onSubmit` (validación cruzada de varios campos, por eso no va en `register`).
- **Tests:** `src/utils/validaciones.test.js` (12 casos). El proyecto pasa a **27 tests en
  verde**.

### 4. Limpieza del historial de Git
- Se decidió **no** usar el trailer `Co-Authored-By` en los commits (es un proyecto de
  portfolio; el historial debe figurar 100% a nombre de Sara).
- El autor de los commits estaba con el **email de la universidad** (`...@uniovi.es`), que no
  está registrado en la cuenta de GitHub → los commits no se enlazaban al perfil. Se corrigió
  la configuración **local** del repo al email real y se reescribió el historial
  (`git filter-branch`), seguido de un `git push --force`.
  - *Lección:* el email del commit (config local de Git) es independiente de la cuenta con la
    que haces `push`; GitHub enlaza cada commit a un perfil **por ese email**.

### Pendiente / cola de mejoras
- **Editar factura** (hoy no se puede modificar una vez creada).
- **Exportar / importar datos** — en concreto, definir **cómo se gestiona la exportación
  cuando se use en escritorio** (qué formato, dónde se guardan los archivos, etc.). Con
  Firebase los datos ya sincronizan, pero falta el flujo de exportación/backup manual.
- Ordenar la lista de facturas.
- Testeo de componentes (React Testing Library) para la interfaz.
- Subir el NIF a "nivel B" (validar el dígito de control).
- Pasada de diseño con la identidad roja de ASTURTEST.

(Ya hechos de esta lista: búsqueda por matrícula, filtros por año/mes, cliente recurrente.)
