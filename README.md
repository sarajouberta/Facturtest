# Facturtest

App de facturación para un taller mecánico, hecha para sustituir el talonario de papel.

No es un proyecto de ejercicio: **está en uso real** en el taller. Eso condicionó casi todas
las decisiones técnicas —tenía que funcionar sin cobertura, en el móvil, y con la numeración
enlazada al talonario que ya se venía usando—, y varias funciones salieron de probarla en el
día a día y ver qué molestaba.

🔗 **[facturtest.vercel.app](https://facturtest.vercel.app)** · instalable como app desde el
navegador.

## Qué hace

- **Facturas** con líneas de concepto dinámicas, mano de obra, IVA y totales calculados en vivo.
- **Numeración correlativa** con número inicial configurable, para enlazar con el talonario de
  papel del taller.
- **Vehículo y cliente**: al teclear la matrícula, si el coche ya pasó por el taller ofrece
  rellenar los datos del cliente de la última factura.
- **Búsqueda por matrícula** y filtros por año y mes.
- **PDF** de la factura, listo para imprimir o compartir por WhatsApp/email desde el móvil.
- **Funciona sin conexión** (PWA): en el taller la cobertura no siempre acompaña.
- **Sincronización entre dispositivos** con login de Google: móvil y ordenador ven lo mismo.

## Stack

| | |
|---|---|
| **React 19 + Vite** | Interfaz y herramienta de build |
| **React Router** | Navegación entre pantallas |
| **Tailwind CSS 4** | Estilos |
| **React Hook Form** | Formularios y validación |
| **Firebase** (Auth + Cloud Firestore) | Login con Google y datos en la nube, con caché local para trabajar sin internet |
| **jsPDF + html2canvas-pro** | Generación del PDF |
| **vite-plugin-pwa** (Workbox) | App instalable y offline |
| **Vitest** | Tests de la lógica de negocio (46) |
| **Vercel** | Despliegue continuo desde `main` |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # y rellenar con las claves del proyecto de Firebase
npm run dev                    # http://localhost:5173
```

Las seis variables `VITE_FIREBASE_*` se sacan de la consola de Firebase → Configuración del
proyecto → Tus apps. Sin ellas la app no arranca.

> Las variables `VITE_*` se **incrustan durante el build**, no se leen en tiempo de ejecución:
> al cambiarlas en producción hay que **redesplegar** para que surtan efecto.

Otros comandos:

```bash
npm run test:run     # tests (una pasada)
npm run test         # tests en modo watch
npm run lint         # oxlint
npm run build        # build de producción en dist/
```

## Cómo están organizados los datos

Todo cuelga del usuario que ha iniciado sesión:

```
users/{uid}/facturas/{id}     ← una factura por documento
users/{uid}/config/taller     ← datos del taller (nombre, NIF, teléfono…)
```

El acceso está restringido por [`firestore.rules`](firestore.rules): cada usuario solo alcanza
su propia rama, comprobado tanto desde la app como contra la API REST sin credenciales.

Toda la capa de datos está aislada en [`src/datos.js`](src/datos.js), que expone hooks
(`useFacturas`, `useFactura`, `useConfig`) y acciones (`crearFactura`, `borrarFactura`,
`guardarConfig`). Ningún componente habla con Firestore directamente.

## Tests

46 tests con Vitest sobre la **lógica de negocio pura** de `src/utils/`: cálculo de importes,
numeración correlativa, validación de NIF y teléfono, normalización de matrículas y búsqueda.
Es la parte de mayor valor y la más fácil de probar, precisamente por estar separada de React.

```bash
npm run test:run
```

## Documentación

El proyecto lleva documentación propia, escrita mientras se construía:

- **[`docs/tecnologias.md`](docs/tecnologias.md)** — qué hace cada tecnología y por qué está
  ahí, con las decisiones de arquitectura explicadas.
- **[`docs/cambios.md`](docs/cambios.md)** — diario de cambios con el **motivo** de cada uno,
  incluidos los fallos y cómo se diagnosticaron.

## Estado

MVP completo y en uso. En la cola: editar facturas, exportar/importar copia de seguridad,
ordenar la lista, tests de componentes y una pasada de diseño.
