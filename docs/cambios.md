# Facturtest — Registro de cambios

Diario de los cambios hechos en la app, con el **motivo** de cada uno (no solo el qué).
Lo más reciente arriba.

---

## 2026-08-06 — El service worker secuestraba el login (cierre del arreglo de julio)

El arreglo del 27 de julio (redirección + proxy) se había subido pero **nunca se llegó a
verificar en el móvil**. Al comprobarlo aparecieron **dos fallos encadenados**: uno de
despliegue y otro de la propia PWA.

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
