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

## Código propio (lógica de negocio)

| Archivo | Para qué |
|---|---|
| `src/utils/calculos.js` | Calcular base imponible y total (lógica pura, separada de React). |
| `src/utils/numeracion.js` | Generar el número correlativo `F-2026-001`. |

## Conceptos de React aplicados

- **Componentes**: piezas de UI reutilizables.
- **Hooks**: funciones `useX` que aportan capacidades (estado, efectos, formularios...).
  Reglas: solo en el nivel superior del componente y solo dentro de componentes/otros hooks.
- **`useEffect`**: ejecutar código al montar una pantalla (p. ej. cargar datos).
- **Renderizado reactivo**: al cambiar un dato, la UI se repinta sola (totales en vivo,
  lista con `useLiveQuery`).

## Modelo de datos

**Factura**
```js
{
  id, numero, fecha,
  cliente: { nombre, nif, direccion },
  conceptos: [ { descripcion, cantidad, precioUnitario } ],
  iva, baseImponible, total
}
```

**Configuración del taller** (registro único, `id: 1`)
```js
{ id: 1, nombre, nif, direccion, telefono, logo }
```

Decisiones de diseño:
- Se guardan `baseImponible` y `total` en la factura (documento legal "congelado").
- Número de factura automático correlativo (`F-2026-001`) con opción a editar.

## Pendiente en el plan

- **Paso 4 — PDF**: `jsPDF` (+ `html2canvas`) y **Web Share API** para exportar/compartir.
- **Paso 5 — PWA**: `Vite PWA Plugin` (Service Worker + Web App Manifest) para instalar
  en el móvil y funcionar sin conexión.
