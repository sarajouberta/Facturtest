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
Dexie), sino una **herramienta de desarrollo y construcción**. Hace dos trabajos:

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
| **Dexie.js** | Base de datos local (IndexedDB) en el dispositivo, sin servidor. `db.facturas.add()`, `db.config.put/get()`. | `db.js`, pantallas |
| **dexie-react-hooks** (`useLiveQuery`) | Las pantallas se actualizan solas al cambiar los datos. | Lista de facturas |
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
  lista con `useLiveQuery`).

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

## Arquitectura de datos: base de datos por dispositivo

Facturtest **no tiene servidor ni base de datos central**. Cada dispositivo guarda los
datos **dentro de su propio navegador**, en **IndexedDB** (la BD integrada en todos los
navegadores), a la que se accede mediante Dexie.js.

Comparación:

```
App clásica (con servidor):
  varios dispositivos ──► SERVIDOR ──► una BD central (datos compartidos)

Facturtest (sin servidor):
  móvil del padre ──► su propia BD (en el móvil)
  PC de Sara      ──► su propia BD (en el navegador)
```

**Consecuencias** (cada BD es independiente y aislada):
- Las facturas creadas en un dispositivo solo existen en ese dispositivo.
- La **Configuración del taller** hay que rellenarla en cada dispositivo (si no, el PDF
  sale con la cabecera vacía).
- No hay sincronización entre dispositivos; incluso Chrome y Firefox del mismo equipo
  tienen bases de datos separadas.

**Por qué se eligió así** (adecuado para el caso: un taller, un móvil, una persona):
- Cero coste (sin servidor que pagar/mantener).
- Funciona **sin internet** (los datos están en el propio dispositivo → habilita la PWA offline).
- Privacidad total (los datos no salen del dispositivo).
- Simplicidad (sin backend, login ni seguridad de red).

**Si en el futuro se quisiera compartir entre dispositivos / copia en la nube**: haría
falta un backend (Node/Express, Spring…) con una BD central (PostgreSQL, MongoDB…) y que
la app hablara con él por internet. Añade complejidad; para el MVP no era necesario.
Alternativa intermedia y sencilla: exportar/importar las facturas a un archivo (backup).

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
2. ✅ Modelo de datos (Dexie + funciones de cálculo)
3. ✅ Pantallas: lista, crear factura, detalle, configuración
4. ✅ Generación de PDF (html2canvas-pro + jsPDF + Web Share API)
5. ✅ PWA instalable (vite-plugin-pwa)

**MVP completo.**

**Extra (post-MVP):** ✅ Tests automáticos con Vitest sobre la lógica de negocio
(12 tests) + corrección del redondeo de importes (coma flotante). Ver sección *Testing*.
✅ Onboarding de primer uso. Ver sección *Onboarding*.

## Onboarding (primer uso)

Al instalar la app en un dispositivo nuevo, la base de datos está vacía y **no hay datos
del taller** (la Configuración es por-dispositivo, ver *Arquitectura de datos*). Sin esto,
el usuario podría crear facturas con la cabecera del PDF en blanco (sin nombre, NIF ni
teléfono del taller). El onboarding lo evita guiando al usuario a configurarse primero.

Dos piezas, ambas guiadas por si existe o no el registro de configuración (`db.config.get(1)`):

1. **Redirección** (`ListaFacturas.jsx`): la pantalla de inicio (`/`) comprueba la config y,
   si no hay, redirige a `/configuracion` con `<Navigate to="/configuracion" replace />`.
   - **`replace`** sustituye la entrada del historial (no la añade), para que "atrás" desde
     Configuración no devuelva a `/` y provoque un bucle de redirección.
2. **Mensaje de bienvenida** (`Configuracion.jsx`): la primera vez (sin config guardada) se
   muestra un aviso "👋 completa los datos de tu taller", con renderizado condicional
   (`{primeraVez && (...)}`) sobre un estado `useState`.

**Detalle técnico importante — distinguir "cargando" de "vacío":** `useLiveQuery` devuelve
`undefined` mientras carga, y `db.config.get(1)` **también** devuelve `undefined` si no hay
config. Para no redirigir por error durante el instante de carga, la consulta convierte el
"no encontrado" en `null` explícito con `?? null`, logrando tres estados distinguibles:

```js
const config = useLiveQuery(() => db.config.get(1).then((c) => c ?? null))
// undefined → cargando  |  null → sin config (onboarding)  |  objeto → hay config
```

## Despliegue

Desplegada en **Vercel** (plan gratuito), conectada al repo de GitHub: cada `git push`
a `main` la redespliega automáticamente. URL: https://facturtest.vercel.app

| Archivo | Para qué |
|---|---|
| `vercel.json` | Redirige TODAS las rutas a `index.html` (`rewrites`) para que el enrutado de React Router funcione en producción (si no, recargar en `/nueva-factura` o `/configuracion` daría 404). |

Nota: JSON no admite comentarios (`//` o `/* */` rompen el archivo); por eso las
explicaciones de configuración van aquí, en la documentación, y no dentro del `.json`.

## Mejoras futuras / pendiente

- **Validaciones** en los campos de los formularios (obligatorios, formatos de NIF,
  importes numéricos válidos, etc.) usando las validaciones de React Hook Form.
- **Quitar los `0` como placeholder** en los campos de importe: al pulsar en un campo
  numérico (precio, mano de obra…) el `0` inicial molesta; que el campo aparezca vacío o
  se borre el 0 al enfocarlo.
- **README** del repositorio (usar este documento como base).
- **Logo real** del taller (el campo `logo` de la config aún no se usa).
- **PDF multipágina** si alguna factura no cabe en un A4.
- **Code-splitting** para reducir el tamaño del paquete JS (aviso del build).
