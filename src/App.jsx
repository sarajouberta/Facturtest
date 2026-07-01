import { Routes, Route, Link } from 'react-router-dom'
import ListaFacturas from './pages/ListaFacturas'
import NuevaFactura from './pages/NuevaFactura'
import Configuracion from './pages/Configuracion'
import './App.css'

function App() {
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
      </header>

      <main>
        <Routes>
          <Route path="/" element={<ListaFacturas />} />
          <Route path="/nueva-factura" element={<NuevaFactura />}/>
          <Route path="/configuracion" element={<Configuracion/>} />
        </Routes>
      </main>
    </div>
  )
}

export default App