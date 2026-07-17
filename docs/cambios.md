# Facturtest — Registro de cambios

Diario de los cambios hechos en la app, con el **motivo** de cada uno (no solo el qué).
Lo más reciente arriba.

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
