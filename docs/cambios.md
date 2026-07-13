# Facturtest — Registro de cambios

Diario de los cambios hechos en la app, con el **motivo** de cada uno (no solo el qué).
Lo más reciente arriba.

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
- Backup / exportar-importar datos (los datos solo viven en el móvil).
- Editar factura, buscar y ordenar la lista, clientes recurrentes.
- Subir el NIF a "nivel B" (validar el dígito de control).
- Pasada de diseño con la identidad roja de ASTURTEST.
