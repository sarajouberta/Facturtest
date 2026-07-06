# Facturtest — Stack tecnológico

Documentación personal del conjunto de tecnologías usadas en el proyecto y para qué
sirve cada una. App de facturación (PWA) para el taller mecánico.

## Base del proyecto

| Tecnología | Para qué | Dónde se usa |
|---|---|---|
| **Node.js + npm** | Gestor de paquetes y scripts (`npm install`, `npm run dev`). | Instalación de librerías |
| **Vite** | Crea el proyecto, arranca el servidor local (`localhost:5173`) y recarga al guardar. | `vite.config.js` |
| **React** | Librería de interfaz: la UI se divide en *componentes* (funciones que devuelven JSX). | Todos los `.jsx` |

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

## Mejoras futuras / pendiente

- **Desplegar** en Vercel o Netlify (build → `dist/`) para tener una URL `https://` real
  con la que instalar la PWA en el móvil (localhost solo sirve para probar en el PC) y
  como enlace de portfolio.
- **README** del repositorio (usar este documento como base).
- **Logo real** del taller (el campo `logo` de la config aún no se usa).
- **PDF multipágina** si alguna factura no cabe en un A4.
- **Code-splitting** para reducir el tamaño del paquete JS (aviso del build).
