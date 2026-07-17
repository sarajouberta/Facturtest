import { Component } from 'react'

// Error Boundary: si un componente hijo revienta AL RENDERIZAR, en vez de dejar
// la pantalla en blanco mostramos un mensaje y un botón para recargar.
//
// Tiene que ser un componente de CLASE: React solo deja capturar errores de
// render con estos dos métodos de ciclo de vida (no hay equivalente con hooks).
// Ojo: solo captura errores DENTRO del render de React; los fallos al arrancar
// la app (imports que petan) se cubren aparte, con el mensaje del index.html.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hayError: false }
  }

  // React lo llama cuando un hijo lanza un error al renderizar. Devolvemos el
  // nuevo estado para pintar la pantalla de respaldo en el siguiente render.
  static getDerivedStateFromError() {
    return { hayError: true }
  }

  // Aquí llega el error real y su traza; lo dejamos en consola para depurar.
  componentDidCatch(error, info) {
    console.error('❌ Error no controlado:', error, info)
  }

  render() {
    if (this.state.hayError) {
      return (
        <div className="max-w-md mx-auto mt-10 text-center flex flex-col gap-4">
          <h2 className="text-xl font-bold">Algo ha ido mal</h2>
          <p className="text-gray-600">
            La aplicación ha tenido un problema. Prueba a recargar; si sigue
            fallando, cierra y vuelve a abrir la app.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white rounded px-4 py-2 font-medium"
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
