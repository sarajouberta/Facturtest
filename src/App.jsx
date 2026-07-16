import { Routes, Route, Link } from 'react-router-dom'
import ListaFacturas from './pages/ListaFacturas'
import NuevaFactura from './pages/NuevaFactura'
import Configuracion from './pages/Configuracion'
import './App.css'
import DetalleFactura from './pages/DetalleFactura'
import { useAuth } from './auth/AuthContext'

function App() {
  const { usuario, cargando, entrar, salir } = useAuth()

  return (
    <div className="app">
      <header>
        <h1 className="text-3xl font-bold text-blue-600">Facturtest</h1>
        <nav>
          <Link to="/">Facturas</Link>
          {' | '}
          <Link to="/nueva-factura">Nueva factura</Link>
          {' | '}
          <Link to="/configuracion">Configuración</Link>
        </nav>

        {!cargando && usuario && (
          <div className="flex items-center gap-2 text-sm">
            <span>{usuario.displayName || usuario.email}</span>
            <button onClick={salir} className="text-blue-600 underline">Salir</button>
          </div>
        )}

      </header>

      <main>
        {cargando ? (
          <p>Cargando…</p>
        ) : !usuario ? (
          <div className="flex flex-col items-center gap-3 mt-10">
            <p>Inicia sesión para acceder a tus facturas.</p>
            <button onClick={entrar} className="bg-blue-600 text-white rounded px-4 py-2">
              Entrar con Google
            </button>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<ListaFacturas />} />
            <Route path="/nueva-factura" element={<NuevaFactura />} />
            <Route path="/factura/:id" element={<DetalleFactura />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Routes>
        )}
      </main>
    </div>
  )
}

export default App