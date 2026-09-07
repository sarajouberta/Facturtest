import { Routes, Route, NavLink } from 'react-router-dom'
import ListaFacturas from './pages/ListaFacturas'
import FormularioFactura from './pages/FormularioFactura'
import Configuracion from './pages/Configuracion'
import DetalleFactura from './pages/DetalleFactura'
import { useAuth } from './auth/AuthContext'
import logoTaller from './assets/logo-taller.png'

/* NavLink es como Link pero sabe si su ruta es la que se está viendo, y pasa
   { isActive } a la función del className. Así se distingue la pestaña actual,
   que antes no había forma de saber dónde estabas. */
const claseEnlace = ({ isActive }) =>
  `px-3 py-2 rounded-t text-sm font-medium ${isActive
    ? 'bg-marca-claro text-marca'
    : 'text-gray-600 hover:bg-gray-100'
  }`

function App() {
  const { usuario, cargando, entrar, salir } = useAuth()

  /* min-h-screen + flex-col, con el main en flex-1: así el pie queda pegado
     abajo aunque la página tenga poco contenido, y detrás del contenido cuando
     hay mucho. */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#fbf8f8] to-[#f4eeee]">
      {/* Cabecera con el logo del taller y filete rojo abajo */}
      <header className="bg-white border-b-4 border-marca">
        <div className="max-w-4xl mx-auto px-4 pt-3 flex items-center gap-3 flex-wrap">
          <img src={logoTaller} alt="" width={44} height={32} className="shrink-0" />
          {/* Oswald: fuente condensada de rótulo, empaquetada con la app para que
              funcione sin conexión (ver index.css y assets/fuentes/LEEME.txt). */}
          <h1 className="font-rotulo text-3xl font-semibold tracking-wide text-marca">
            Facturtest
          </h1>

          {!cargando && usuario && (
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-gray-600">{usuario.displayName || usuario.email}</span>
              <button onClick={salir} className="text-gray-600 hover:text-marca underline">
                Salir
              </button>
            </div>
          )}
        </div>

        {!cargando && usuario && (
          <nav className="max-w-4xl mx-auto px-4 pt-2 flex gap-1">
            {/* end: sin él, "Facturas" saldría activa en todas las rutas, porque
                "/" es prefijo de cualquier otra. */}
            <NavLink to="/" className={claseEnlace} end>Facturas</NavLink>
            <NavLink to="/nueva-factura" className={claseEnlace}>Nueva factura</NavLink>
            <NavLink to="/configuracion" className={claseEnlace}>Configuración</NavLink>
          </nav>
        )}
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {cargando ? (
          <p>Cargando…</p>
        ) : !usuario ? (
          <div className="flex flex-col items-center gap-4 mt-16 text-center">
            <img src={logoTaller} alt="" width={131} height={96} />
            <p className="text-gray-600">Inicia sesión para acceder a tus facturas.</p>
            <button onClick={entrar} className="bg-marca hover:bg-marca-oscuro text-white rounded px-4 py-2 font-medium">
              Entrar con Google
            </button>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<ListaFacturas />} />
            <Route path="/nueva-factura" element={<FormularioFactura />} />
            <Route path="/factura/:id" element={<DetalleFactura />} />
            <Route path="/factura/:id/editar" element={<FormularioFactura />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Routes>
        )}
      </main>

      {/* Guiño a la tarjeta del taller: las franjas diagonales del icono, en la
          esquina de abajo. Es decoración pura, de ahí el aria-hidden (los
          lectores de pantalla lo ignoran) y el pointer-events-none (no se
          interpone con nada que haya debajo). */}
      <footer aria-hidden="true" className="pointer-events-none mt-10 flex justify-end">
        <div
          className="h-10 w-48"
          style={{
            background: `linear-gradient(115deg,
              transparent 0 22%,
              #141414 22% 40%,
              #8c8c8c 40% 58%,
              #f7d000 58% 76%,
              #d31e1e 76% 94%,
              transparent 94%)`,
          }}
        />
      </footer>
    </div>
  )
}

export default App
