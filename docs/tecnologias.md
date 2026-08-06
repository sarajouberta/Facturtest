# Facturtest — Stack tecnológico

Documentación personal del conjunto de tecnologías usadas en el proyecto y para qué
sirve cada una. App de facturación (PWA) para el taller mecánico.

## Base del proyecto

| Tecnología | Para qué | Dónde se usa |
|---|---|---|
| **Node.js + npm** | Gestor de paquetes y scripts (`npm install`, `npm run dev`). | Instalación de librerías |
| **Vite** | Crea el proyecto, arranca el servidor local (`localhost:5173`) y recarga al guardar. | `vite.config.js` |
| **React** | Librería de interfaz: la UI se divide en *componentes* (funciones que devuelven JSX). | Todos los `.jsx` |

### ¿Qué es Vite exactamente?

Vite (francés, "rápido") NO es una librería que se ejecute dentro de la app (como React o
Firebase), sino una **herramienta de desarrollo y construcción**. Hace dos trabajos:

1. **Servidor de desarrollo** (`npm run dev`): sirve la app en `localhost:5173` con
   arranque instantáneo y **hot reload** (al guardar, el navegador se actualiza solo sin
   recargar toda la página).
2. **Empaquetador para producción** (`npm run build`): coge todo el código (`.jsx`, CSS,
   imágenes, librerías) y lo transforma y optimiza en pocos archivos finales pequeños y
   rápidos (carpeta `dist/`), listos para desplegar.

**Por qué hace falta**: el navegador no entiende directamente el JSX, ni los `import` de
CSS/imágenes, ni el código repartido en muchos archivos. Vite es el "traductor y
organizador" que convierte el código cómodo de escribir en algo que el navegador sabe
ejecutar.

**Analogía**: es el equivalente frontend de **Maven/Gradle** en Java — compila y empaqueta
el proyecto (código fuente → web optimizada), y además da el servidor de desarrollo con
recarga en caliente. Sustituye a la antigua Create React App (más lenta, ya en desuso).

Comandos (en `package.json`): `npm run dev` (desarrollo), `npm run build` (producción),
`npm run preview` (previsualizar el build). Se configura en `vite.config.js`.

## Navegación y estilos

| Tecnología | Para qué | Dónde se usa |
|---|---|---|
| **React Router** (`react-router-dom`) | Navegar entre pantallas sin recargar (`/`, `/nueva-factura`, `/configuracion`). Piezas: `<Routes>`, `<Route>`, `<Link>`, `useNavigate`. | `main.jsx`, `App.jsx` |
| **Tailwind CSS** | Estilos mediante clases de utilidad (`flex`, `border`, `text-blue-600`...) en el JSX. | En el `className` de los componentes |

## Datos y formularios

| Tecnología | Para qué | Dónde se usa |
|---|---|---|
| **Cloud Firestore** (`firebase/firestore`) | Base de datos en la nube, sincronizada entre dispositivos y con copia local para trabajar sin internet. `addDoc()`, `setDoc()`, `deleteDoc()`, `onSnapshot()`. | `datos.js` (toda la app pasa por ahí) |
| **Firebase Auth** (`firebase/auth`) | Login con Google. Da el `uid` del que cuelgan todos los datos. | `firebase.js`, `auth/AuthContext.jsx` |
| **Hooks propios** (`useFacturas`, `useFactura`, `useConfig`) | Las pantallas se actualizan solas al cambiar los datos: envuelven `onSnapshot` en `useState` + `useEffect`. | `datos.js` |
| **React Hook Form** | Gestión de formularios. Piezas: `useForm`, `register`, `handleSubmit`, `watch`, `setValue`, y `useFieldArray` para líneas dinámicas. | `NuevaFactura.jsx`, `Configuracion.jsx` |

## Generación de PDF

| Tecnología | Para qué | Dónde se usa |
|---|---|---|
| **html2canvas-pro** | "Fotografía" un trozo de HTML (la hoja de factura) y lo convierte en imagen. Es un fork moderno de html2canvas que soporta el CSS actual (colores `oklch` de Tailwind v4). | `DetalleFactura.jsx` (`exportarPDF`) |
| **jsPDF** | Crea el archivo PDF y coloca dentro la imagen capturada (A4 vertical, centrada). | `DetalleFactura.jsx` |
| **Web Share API** (`navigator.share`) | API nativa del navegador móvil: abre el menú de compartir del sistema (WhatsApp, email, imprimir). Si el dispositivo no la soporta (PC), se descarga el PDF. | `DetalleFactura.jsx` |

Nota: la hoja imprimible (`FacturaPDF.jsx`) se maqueta con **estilos en línea** (no Tailwind)
para fidelidad de impresión, y se mantiene oculta fuera de pantalla
(`position:absolute; left:-9999px`) para poder capturarla sin que el usuario la vea.

## PWA (app instalable / offline)

| Tecnología | Para qué | Dónde se usa |
|---|---|---|
| **vite-plugin-pwa** | Convierte la web en PWA: genera automáticamente el Service Worker y el manifest. | `vite.config.js` (`VitePWA({...})`) |
| **Service Worker** (`dist/sw.js`) | Cachea la app para que funcione **sin internet** tras la primera carga. Lo genera el plugin. | Generado en el build |
| **Web App Manifest** | Define nombre, icono y colores al instalar la app (`display: standalone` = a pantalla completa, sin barra del navegador). | Generado en el build; iconos en `public/` |

### ¿Qué es un Service Worker?

Es un archivo JavaScript que el navegador ejecuta **aparte de la página**, en su propio hilo
de fondo. No tiene acceso al DOM (no puede tocar la interfaz, ni leer un `<input>`, ni pintar
nada) y sigue vivo aunque se cierre la pestaña. A cambio tiene un poder que ningún otro
código de la app tiene:

> **Se pone en medio entre la app y la red.** Cada vez que el navegador va a pedir algo — un
> `.js`, una imagen, una navegación a una URL — el service worker lo intercepta primero y
> decide qué responder: dejarlo pasar a internet, responder con una copia guardada en caché,
> o incluso inventarse la respuesta.

Es, en la práctica, un **proxy que vive dentro del navegador**, del lado del cliente.

**Para qué sirve aquí:** es lo que hace que Facturtest funcione en el taller sin cobertura.
Con el móvil en modo avión no hay servidor al que pedir nada, pero el service worker tiene
guardados el HTML, el JS y el CSS y los sirve él, así que la app arranca. (Los datos son otra
historia: viven en el propio dispositivo, hoy en la caché offline de Firestore.)

**El mismo poder es un arma de doble filo:** si una URL del dominio propio *no* es una ruta de
la app, el service worker la intercepta igual. Es exactamente lo que rompió el login con
Google en agosto de 2026 (ver `cambios.md`).

#### Ciclo de vida: por qué hay que reinstalar la PWA

Un service worker **no se actualiza como un archivo normal**. Pasa por
**install → waiting → activate**, y el detalle importante es el estado intermedio: mientras
quede una ventana abierta controlada por la versión vieja, la nueva **espera en la banda** sin
activarse. Está diseñado así a propósito, para evitar que media app funcione con la versión
antigua y la otra media con la nueva.

- `registerType: 'autoUpdate'` (en `vite.config.js`) hace que el plugin genere el código que
  empuja a la versión nueva a saltarse esa cola.
- Aun así, en un móvil con la PWA instalada y pantallas en segundo plano la transición es poco
  fiable. **Desinstalar y reinstalar la app** es la forma bruta de garantizar que el service
  worker viejo desaparece.
- Es la causa de los dos sustos post-deploy del proyecto: la pantalla en blanco de julio y el
  "Cargando…" eterno de agosto. Ante un comportamiento raro tras desplegar, **sospechar
  siempre del service worker viejo**.

### ¿Qué es Workbox?

Escribir un service worker a mano es tedioso y fácil de estropear: hay que versionar las
cachés, elegir estrategia para cada tipo de archivo, limpiar las cachés viejas al activar,
evitar que crezcan sin límite…

**Workbox es la librería de Google que trae todo eso ya resuelto.** No es un estándar del
navegador ni magia: es código que envuelve la API de service workers y ofrece recetas con
nombre (`CacheFirst`, `NetworkFirst`, `StaleWhileRevalidate`, precaching automático de los
archivos del build).

En este proyecto **nunca se escribe un service worker a mano**. La cadena es:

```
npm run build
  └─ vite-plugin-pwa recoge lo que Vite ha generado
      └─ le pasa a Workbox la configuración del bloque workbox: { ... }
          └─ Workbox escribe dist/sw.js  ← el service worker de verdad
```

Por eso el bloque de `vite.config.js` se llama `workbox`: **es la configuración que el plugin
le pasa a Workbox** para generar el archivo. Y por eso cualquier cambio ahí solo surte efecto
tras un build y un deploy nuevos — el service worker es un **artefacto de compilación**, igual
que las variables `VITE_*`.

#### `navigateFallback` y la lista de excepciones

Workbox distingue las peticiones de **navegación** (teclear una URL, pulsar un enlace, una
redirección) del resto de recursos. En una SPA todas las rutas (`/`, `/nueva-factura`,
`/factura/7`) se sirven con el mismo `index.html` y es React Router quien decide qué pintar;
`navigateFallback: index.html` codifica precisamente eso, y es lo que permite abrir
`/factura/7` sin conexión.

El problema es que esa regla dice *cualquier* navegación, y `/__/auth/handler` **no es una ruta
de la app**: es una puerta al servidor de Firebase que, por el proxy de `vercel.json`, resulta
que vive en el dominio propio. De ahí la lista de excepciones:

```js
workbox: {
  navigateFallbackDenylist: [/^\/__\/auth\//],   // "esto no es mío, déjalo ir a la red"
}
```

Se puede comprobar en el `sw.js` publicado, que acaba con:
`registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), {denylist:[/^\/__\/auth\//]}))`.

## Código propio (lógica de negocio)

| Archivo | Para qué |
|---|---|
| `src/utils/calculos.js` | `calcularTotalMateriales` (suma de materiales), `calcularBaseImponible` (materiales + mano de obra) y `calcularTotal` (base + IVA). Lógica pura, separada de React. |
| `src/utils/numeracion.js` | Generar el número correlativo `F-2026-001` (`generarSiguienteNumero`). |
| `src/components/FacturaPDF.jsx` | Componente de la "hoja imprimible" de la factura (recibe `factura` y `config` por props). |

## Testing (pruebas automáticas)

| Tecnología | Para qué | Dónde se usa |
|---|---|---|
| **Vitest** | Framework de tests integrado con Vite (el equivalente a **JUnit** en Java). Ejecuta pruebas que comprueban que las funciones devuelven lo esperado. | `vite.config.js` (bloque `test`), archivos `*.test.js` |

Se instala como dependencia de desarrollo (`npm install -D vitest`): solo se usa para
programar/probar, **no** forma parte de la app desplegada (como el `<scope>test</scope>`
de Maven). Comparte la configuración de Vite; se activa con un bloque en `vite.config.js`:

```js
test: { globals: true, environment: 'node' }
```

- **`globals: true`** → permite usar `describe`, `test`, `expect` sin importarlos en cada archivo.
- **`environment: 'node'`** → los tests corren en Node, sin simular navegador (no hace
  falta: probamos lógica pura, no interfaz). Por eso **no** se necesita `jsdom` ni React Testing Library.

**Qué se prueba**: solo la **lógica de negocio pura** de `src/utils/` (los cálculos y la
numeración). Es lo de mayor valor y lo más fácil de testear, precisamente porque está
separada de React (sin UI, sin base de datos → funciones que reciben datos y devuelven un
resultado). No se testean componentes ni flujos de navegador (mayor esfuerzo, menor retorno para este proyecto).

| Archivo de test | Cubre | Casos incluidos |
|---|---|---|
| `src/utils/calculos.test.js` | `calcularTotalMateriales`, `calcularBaseImponible`, `calcularTotal` | suma de materiales, lista vacía, mano de obra vacía (`''` → 0), IVA 21%, IVA 0, redondeo a 2 decimales |
| `src/utils/numeracion.test.js` | `generarSiguienteNumero` | primer número (`001`), siguiente al más alto, ceros a la izquierda (`9 → 010`), filtrado por año, uso del máximo (no del conteo) para no repetir número |

12 tests en total. Estructura de cada test: patrón **Arrange · Act · Assert**
(preparar los datos → ejecutar la función → comprobar el resultado con `expect(...).toBe(...)`).

**Scripts** (en `package.json`):
- `npm test` → modo *watch*: se queda vigilando y re-ejecuta los tests al guardar (día a día).
- `npm run test:run` → una sola pasada y termina, devolviendo OK/fallo (para CI, p. ej. GitHub Actions).

### Bug encontrado gracias a los tests: coma flotante en el dinero

Al testear los importes salió a la luz un problema clásico y serio en apps de dinero: los
ordenadores guardan los decimales en binario (estándar **IEEE 754**) y números como `0.1`
no tienen representación exacta. Resultado real:

```js
3 * 0.1        // → 0.30000000000000004  (¡no 0.3!)
0.1 + 0.2      // → 0.30000000000000004
```

Sin corregirlo, un total podría mostrarse como `12,340000000001 €` en el PDF. Pasa también
en Java (`double`), Python, C… no es un fallo de JS. **Solución** aplicada en `calculos.js`:
una función `redondear(n) = Math.round(n * 100) / 100` que se aplica al resultado de las tres
funciones de dinero (multiplica por 100 → redondea al entero → divide por 100). Así el
importe queda siempre a 2 decimales en el formulario, la base de datos y el PDF. Se arregló
siguiendo el ciclo **TDD rojo → verde**: primero un test que falla evidenciando el error,
luego el arreglo en el código de negocio, y el test pasa a verde confirmando la corrección.

### Estrategia de testing a futuro: la pirámide

Lo hecho hasta ahora (Vitest sobre `src/utils/`) es la **base** de una estrategia más
amplia. La idea clásica es la *pirámide de testing*: muchos tests baratos abajo, pocos
tests caros arriba.

```
        /\      pocos   → E2E: recorren la app entera como un usuario
       /  \     algunos → componente: un formulario reacciona bien
      /____\    muchos  → unitario: lógica pura  ← lo que YA tenemos
```

| Capa | Qué prueba | Herramienta (JS) | ¿Navegador? | Equivalente en Java |
|---|---|---|---|---|
| **Unitario** (hecho) | Una función aislada (cálculos, numeración). | **Vitest** | No (Node) | JUnit sobre una clase de lógica |
| **Componente** (futuro) | Un componente React: escribir en un campo y ver que aparece el error, etc. | **React Testing Library** + `jsdom` | Simulado (DOM en memoria) | *(no hay equivalente directo)* |
| **End-to-end** (futuro) | La app completa navegando de pantalla en pantalla. | **Playwright** / Cypress | Real | **Selenium** WebDriver |

**Nota didáctica (paralelismo con Java):** los tests **E2E** con Playwright/Cypress son el
equivalente moderno de **Selenium** — abren un navegador de verdad y automatizan a un
usuario (localizar campo → escribir → clic → comprobar). Selenium también existe para JS,
pero Playwright/Cypress lo han desplazado por ser más rápidos y estables (esperan solos a
que los elementos aparezcan, sin `sleep`/`wait` manuales). En cambio, **React Testing
Library NO** es como Selenium: usa un DOM *simulado* (`jsdom`), sin navegador real, para
probar un componente aislado.

**Regla de diseño que se repite:** cuanto más se mueva la lógica a **funciones puras** (en
`src/utils/`), más se cubre con tests unitarios baratos y menos se depende de los caros. Por
eso, cuando se implementen las **validaciones**, la estrategia será sacar las reglas a
funciones puras (p. ej. `esNifValido(nif)`) y testearlas como los cálculos de hoy; y solo
si se quiere, añadir uno o dos tests de componente por encima.

## Conceptos de React aplicados

- **Componentes**: piezas de UI reutilizables.
- **Hooks**: funciones `useX` que aportan capacidades (estado, efectos, formularios...).
  Reglas: solo en el nivel superior del componente y solo dentro de componentes/otros hooks.
- **`useEffect`**: ejecutar código al montar una pantalla (p. ej. cargar datos).
- **`useRef`**: guarda una referencia a un elemento del DOM real (p. ej. la hoja a
  capturar para el PDF). Sobrevive entre re-renders y no provoca repintados.
- **`props`**: datos que un componente recibe "desde fuera", como argumentos de una
  función (`<FacturaPDF factura={factura} config={config} />`).
- **Ámbito (scope)**: las funciones que usan datos del componente deben estar DENTRO de
  la función del componente; fuera, esas variables no existen.
- **Renderizado reactivo**: al cambiar un dato, la UI se repinta sola (totales en vivo,
  lista con los hooks propios de `datos.js`, que escuchan Firestore con `onSnapshot`).

### Recordatorio: ¿qué es un hook?

Un **hook** es una función especial de React cuyo nombre empieza por `use`. Su superpoder
es "enganchar" un componente a cosas que viven fuera de él y que **cambian con el tiempo**
(estado, ciclo de vida, un contexto, una suscripción…). Cuando eso a lo que está enganchado
cambia, React **vuelve a pintar** el componente solo. De ahí el nombre (*hook* = gancho).

Los dos básicos:

- **`useState`** → la memoria del componente. Guarda un valor y, al cambiarlo con su
  `setX`, React repinta. Ej.: `const [facturas, setFacturas] = useState(undefined)`.
- **`useEffect`** → ejecutar "efectos" que tocan el mundo exterior (suscribirse a Firebase,
  un temporizador…) y **limpiarlos** después devolviendo una función de baja.

Las **dos reglas** (el linter las vigila): (1) solo se llaman dentro de un componente o de
otro hook; (2) solo en el nivel de arriba, nunca dentro de un `if`, un bucle o un `return`.
La regla 2 es la razón de que las **acciones** de escritura (`crearFactura`, `borrarFactura`…)
NO sean hooks: se llaman dentro de una función de evento (al pulsar un botón), donde no se
puede usar `useAuth`; por eso leen el usuario con `auth.currentUser`.

**Custom hooks (hooks propios):** puedes fabricar los tuyos combinando los de React, y se
usan como uno más. En la Fase 4, `useFacturas()` junta por dentro `useAuth` + `useState` +
`useEffect` (suscripción a Firestore con `onSnapshot`), y por fuera se usa en una línea:
`const facturas = useFacturas()` → se repinta solo cuando cambian los datos, aquí o en otro
dispositivo. La convención `use…` no es decoración: le dice a React y al linter que apliquen
las reglas de arriba.

## Modelo de datos

**Factura**
```js
{
  id, numero, fecha,
  cliente:  { nombre, nif, direccion, localidad, provincia, telefono },
  vehiculo: { modelo, vehiculo, matricula, km },
  trabajos,                                          // texto libre
  conceptos: [ { descripcion, cantidad, precioUnitario } ],  // "materiales"
  manoDeObra,                                        // importe en €
  iva,
  totalMateriales,   // suma de los materiales
  baseImponible,     // = totalMateriales + manoDeObra
  total              // = baseImponible + IVA
}
```

**Configuración del taller** (registro único, `id: 1`)
```js
{ id: 1, nombre, titular, nif, actividad, direccion, telefono, logo }
```

Decisiones de diseño:
- Se guardan `totalMateriales`, `baseImponible` y `total` en la factura (documento legal "congelado").
- Número de factura automático correlativo (`F-2026-001`) con opción a editar.
- Cálculo: `base = materiales + mano de obra`; el IVA se aplica sobre la base.
- Modelo ampliado tras analizar la factura de papel real del taller (vehículo, mano de
  obra separada, cliente completo, trabajos realizados).

## Arquitectura de datos: una rama por usuario, en la nube

> **Histórico:** hasta el 16/07/2026 los datos vivían **solo en el dispositivo** (IndexedDB vía
> Dexie), sin servidor. Eso daba coste cero y privacidad total, pero cada dispositivo tenía su
> propia base aislada: las facturas del móvil no existían en el PC y la configuración del taller
> había que rellenarla en cada sitio. Se migró a **Firestore** para tener sincronización real
> entre dispositivos. Ver `cambios.md`.

Hoy los datos viven en **Cloud Firestore** (base de datos de documentos, en la nube), y todo
cuelga del usuario que ha iniciado sesión:

```
users/{uid}/facturas/{idFactura}     ← una factura por documento
users/{uid}/config/taller            ← documento único con los datos del taller
```

```
Facturtest (con Firestore):
  móvil del padre ──┐
                    ├──► users/{uid}/…  (la MISMA rama, sincronizada)
  PC de Sara      ──┘
```

**Consecuencias:**
- Los dispositivos que entran **con la misma cuenta de Google** comparten datos y se
  sincronizan solos: `onSnapshot` repinta las pantallas en cuanto algo cambia.
- La configuración del taller se rellena **una vez**, no en cada dispositivo.
- El `uid` no es un dato más de la factura, es **parte de la ruta**. Eso es lo que permite que
  las reglas de seguridad sean una sola línea (ver abajo).

**Sigue funcionando sin internet.** No se perdió la ventaja del modelo anterior: `firebase.js`
inicializa Firestore con `persistentLocalCache`, que guarda una copia en IndexedDB (igual que
hacía Dexie) y sincroniza al recuperar la red.

- *Efecto secundario a tener en cuenta al depurar:* la app puede **parecer que funciona sin
  haber hablado con el servidor**, porque lee de esa copia local. Para probar de verdad una
  lectura o una regla, usar una **ventana de incógnito** (caché vacía) y mirar la consola.

## Seguridad: reglas de Firestore

Las claves de Firebase (`apiKey`, `projectId`…) **son públicas por diseño**: viajan dentro del
bundle, cualquiera puede leerlas con F12. No son una contraseña, solo identifican el proyecto.
Lo que protege los datos **no** son las claves, sino las **reglas de seguridad**.

Las reglas se evalúan **en el servidor de Google**, antes de tocar los datos, en toda petición:
venga de la app, de otra app o de la **API REST** de Firestore (que es pública y no necesita tu
código para nada). Por eso son la única defensa real.

Fuente de la verdad: **`firestore.rules`** en la raíz del repo.

```js
match /users/{uid}/{documento=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

- **`{documento=**}`** es un comodín **recursivo**: cubre `facturas/{id}`, `config/taller` y
  cualquier subcolección que se añada en el futuro bajo el usuario.
- **`request.auth != null`** → hay sesión iniciada.
- **`request.auth.uid == uid`** → el uid del token coincide con el de la ruta. Lo rellena
  Firebase tras validar el token de Google; **el cliente no puede falsearlo**.
- Todo lo que no se permite explícitamente queda **denegado por defecto**.

**Importante:** el archivo del repo no protege nada por sí solo. Las reglas que se aplican son
las **publicadas** (consola de Firebase → Firestore Database → Rules). Es el mismo patrón que
las variables `VITE_*` y el `sw.js`: repo y producción son cosas distintas hasta que se
despliega.

### Cómo se comprueban

Dos pruebas complementarias, y **hacen falta las dos**: una regla probada solo por el lado que
permite no está probada.

1. **Que no estorban** — recorrer la app en incógnito (crear, leer, guardar config, borrar) con
   la consola abierta. Silencio = bien; los hooks de `datos.js` registran cualquier
   `permission-denied` con el prefijo `❌ Firestore …`.
2. **Que sí protegen** — pedir datos **sin credenciales** a la API REST. Debe responder `403
   PERMISSION_DENIED`:

   ```
   curl "https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/(default)/documents/users/xyz/facturas"
   ```

La consola trae además un **Rules Playground** para simular peticiones (elegir operación, ruta y
si hay usuario autenticado). Firebase está empujando a sustituirlo por el **Emulator Suite**,
que levanta un Firestore local y permite escribir **tests automáticos** de las reglas con
`@firebase/rules-unit-testing` — pendiente en mejoras futuras. Ojo: el emulador prueba el
**archivo local**, no lo publicado.

### Lo que estas reglas NO hacen

Controlan **quién** accede, no **qué** se escribe: un usuario autenticado puede guardar en su
propia rama un documento con cualquier forma (una factura sin número, un total en texto). Para
un usuario único no es un problema real; validar la forma de los datos en las reglas sería el
paso siguiente, y encaja cuando se implemente *editar factura*.

## Anatomía de un archivo `.jsx` — las 3 capas

Un componente React (`.jsx`) NO es solo JavaScript: mezcla **tres capas** en el mismo
sitio. En web clásica iban en archivos separados (HTML + CSS + JS); React las junta
porque una pieza de interfaz necesita las tres a la vez.

1. **JavaScript** (la lógica): variables, funciones, `.map()`, condiciones, operadores.
   ```js
   const totalMateriales = factura.totalMateriales ?? 0
   ```
2. **JSX** (la estructura): etiquetas tipo HTML (`<div>`, `<span>`, `<table>`). No es
   HTML de verdad, es sintaxis de React. Todo lo que va entre **llaves `{ }}`** dentro
   del JSX es una "ventana" para volver a JavaScript:
   ```jsx
   <h2>Factura {factura.numero}</h2>
   {factura.conceptos?.map((c, i) => ( ... ))}
   {factura.trabajos && ( ... )}   // renderizado condicional
   ```
3. **Tailwind / CSS** (el aspecto): lo que va dentro de `className="..."`.
   ```jsx
   className="border rounded p-4 text-sm text-gray-600"
   ```

Cómo distinguirlas de un vistazo:

| Ves esto... | Es... |
|---|---|
| `const`, `function`, `.map()`, `??`, `=>` | JavaScript |
| `<div>`, `<span>`, `<table>` (etiquetas) | JSX (estructura) |
| `{ algo }` dentro de las etiquetas | JavaScript metido en el JSX |
| contenido de `className="..."` | Tailwind / CSS (aspecto) |

El nombre `.jsx` (en vez de `.js`) es la pista de que dentro hay JSX además de JavaScript.

## Estado del plan (MVP)

1. ✅ Proyecto React + Vite
2. ✅ Modelo de datos (Dexie + funciones de cálculo) — *la capa de datos se migró luego a
   Firestore; ver `cambios.md` (16/07/2026)*
3. ✅ Pantallas: lista, crear factura, detalle, configuración
4. ✅ Generación de PDF (html2canvas-pro + jsPDF + Web Share API)
5. ✅ PWA instalable (vite-plugin-pwa)

**MVP completo.**

**Extra (post-MVP):**
- ✅ Tests automáticos con Vitest sobre la lógica de negocio (hoy **46 tests**) + corrección
  del redondeo de importes (coma flotante). Ver sección *Testing*.
- ✅ Onboarding de primer uso. Ver sección *Onboarding*.
- ✅ Validaciones de formulario (obligatorios, NIF, teléfono, importes) — 08/07/2026.
- ✅ Búsqueda por matrícula, filtros por año/mes y cliente recurrente — 16-17/07/2026.
- ✅ Sincronización multi-dispositivo con Firebase (Auth + Firestore) — 13-16/07/2026.
- ✅ Manejo de errores: Error Boundary + respaldo en `index.html` — 17/07/2026.
- ✅ **Reglas de seguridad de Firestore** (cada usuario solo ve sus datos) — 06/08/2026.
  Ver sección *Seguridad*.

## Onboarding (primer uso)

Al instalar la app en un dispositivo nuevo, la base de datos está vacía y **no hay datos
del taller** (la Configuración es por-dispositivo, ver *Arquitectura de datos*). Sin esto,
el usuario podría crear facturas con la cabecera del PDF en blanco (sin nombre, NIF ni
teléfono del taller). El onboarding lo evita guiando al usuario a configurarse primero.

Dos piezas, ambas guiadas por si existe o no el documento de configuración (`useConfig()`):

1. **Redirección** (`ListaFacturas.jsx`): la pantalla de inicio (`/`) comprueba la config y,
   si no hay, redirige a `/configuracion` con `<Navigate to="/configuracion" replace />`.
   - **`replace`** sustituye la entrada del historial (no la añade), para que "atrás" desde
     Configuración no devuelva a `/` y provoque un bucle de redirección.
2. **Mensaje de bienvenida** (`Configuracion.jsx`): la primera vez (sin config guardada) se
   muestra un aviso "👋 completa los datos de tu taller", con renderizado condicional
   (`{primeraVez && (...)}`) sobre un estado `useState`.

**Detalle técnico importante — distinguir "cargando" de "vacío":** si el hook devolviera
`undefined` en los dos casos (mientras carga y cuando no hay config), la app redirigiría a
`/configuracion` durante el instante de carga. Por eso `useConfig` convierte el "no existe" en
`null` **explícito**, logrando tres estados distinguibles:

```js
// datos.js — dentro de useConfig()
onSnapshot(refConfig(usuario.uid), (snap) => {
  setConfig(snap.exists() ? snap.data() : null)   // ← el null explícito
})
// undefined → cargando  |  null → sin config (onboarding)  |  objeto → hay config
```

Las pantallas se apoyan en los tres estados: `ListaFacturas.jsx:24` espera mientras algo sea
`undefined` y `ListaFacturas.jsx:27` redirige solo cuando la config es `null`.

*(El patrón viene de la época de Dexie, donde `useLiveQuery` devolvía `undefined` al cargar y
`db.config.get(1)` también si no había registro; se resolvía igual, con un `?? null`.)*

## Despliegue

Desplegada en **Vercel** (plan gratuito), conectada al repo de GitHub: cada `git push`
a `main` la redespliega automáticamente. URL: https://facturtest.vercel.app

| Archivo | Para qué |
|---|---|
| `vercel.json` | Dos `rewrites`, **en orden**: (1) `/__/auth/:path*` → el proyecto de Firebase (proxy del login, para que la redirección de Google ocurra en el dominio propio y no haya cookies de terceros); (2) el resto de rutas → `index.html`, para que el enrutado de React Router funcione en producción (si no, recargar en `/nueva-factura` daría 404). |

El orden importa: la regla comodín `/(.*)` se traga todo lo que llegue hasta ella, así que la
del login tiene que ir **antes**. Ojo: esa misma dualidad hay que repetirla en el service
worker (`navigateFallbackDenylist`), que aplica la regla del `index.html` por su cuenta desde
dentro del navegador — arreglar solo `vercel.json` no basta. Ver *PWA*.


Nota: JSON no admite comentarios (`//` o `/* */` rompen el archivo); por eso las
explicaciones de configuración van aquí, en la documentación, y no dentro del `.json`.

## Mejoras futuras / pendiente

> La cola viva de mejoras está al final de **`cambios.md`**, que se actualiza en cada sesión.
> Aquí quedan solo las de calado técnico, con su porqué. *(Las validaciones de formulario y el
> `0` de los campos de importe, que figuraban aquí, se hicieron el 08/07/2026.)*

- **Tests automáticos de las reglas de seguridad** con Emulator Suite
  (`firebase-tools` + `@firebase/rules-unit-testing`): convertiría las comprobaciones manuales
  de la sección *Seguridad* en tests ejecutables junto a los de Vitest. Requiere instalar el
  emulador y una JDK. Ojo: prueba el archivo `firestore.rules` **local**, no lo publicado.
- **Validación de forma en las reglas**: hoy controlan quién accede, no qué se escribe.
- **README** del repositorio (usar este documento como base).
- **Logo real** del taller (el campo `logo` de la config aún no se usa).
- **PDF multipágina** si alguna factura no cabe en un A4.
- **Code-splitting** para reducir el tamaño del paquete JS (aviso del build).
