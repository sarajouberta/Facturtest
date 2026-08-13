import { createContext, useContext, useEffect, useState } from 'react'
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

const AuthContext = createContext(null)

/* ¿La app corre como PWA instalada (standalone)? En ese modo el navegador NO deja
abrir el popup de Google (signInWithPopup falla en silencio), así que hay que usar
la redirección de página completa. matchMedia cubre Android/escritorio;
navigator.standalone es el caso especial de iOS. */
function esStandalone() {
    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    )
}

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null)     //null = nadie logueado
    const [cargando, setCargando] = useState(true)   //true mientras Firebase comprueba si ya había sesión

    /*patrón del useEffect: suscribirse al montar y devolver la función de baja para limpiar.
    Es el mismo onAuthStateChanged el que devuelve esa función de desuscripción.
    Sin eso, habría fugas de memoria */
    useEffect(() => {
        // Al volver de un login por redirección (móvil/PWA), aquí recogemos el
        // resultado y, sobre todo, cualquier error que antes se perdía.
        getRedirectResult(auth).catch((e) => {
            console.error('Error al volver del login con Google:', e)
            alert('No se ha podido entrar con Google. Inténtalo de nuevo.')
        })

        // Firebase nos avisa de cada cambio de sesión (entrar, salir, recargar la página)
        const desuscribir = onAuthStateChanged(auth, (u) => {
            setUsuario(u)
            setCargando(false)
        })
        return desuscribir   //limpieza: nos damos de baja al desmontar
    }, [])

    const entrar = async () => {
        try {
            // En PWA instalada el popup no abre; vamos directos a redirección.
            if (esStandalone()) {
                await signInWithRedirect(auth, googleProvider)
                return
            }
            await signInWithPopup(auth, googleProvider)
        } catch (e) {
            // En el navegador el popup puede estar bloqueado o cerrarse: caemos a
            // redirección, que funciona en todas partes.
            if (
                e.code === 'auth/popup-blocked' ||
                e.code === 'auth/cancelled-popup-request' ||
                e.code === 'auth/operation-not-supported-in-this-environment'
            ) {
                await signInWithRedirect(auth, googleProvider)
                return
            }
            // popup-closed-by-user = el usuario cerró la ventana a propósito: no molestamos.
            if (e.code === 'auth/popup-closed-by-user') return
            console.error('Error al entrar con Google:', e)
            alert('No se ha podido entrar con Google. Inténtalo de nuevo.')
        }
    }

    /* Con su try/catch, como entrar: sin él, un fallo al cerrar sesión sería una
       rejection no capturada y el botón se quedaría mudo — el mismo patrón que
       dejó el login sin respuesta en julio. */
    const salir = async () => {
        try {
            await signOut(auth)
        } catch (e) {
            console.error('❌ Error al cerrar sesión:', e)
            alert('No se pudo cerrar la sesión. Inténtalo de nuevo.')
        }
    }

    return (
        <AuthContext.Provider value={{ usuario, cargando, entrar, salir }}>
            {children}
        </AuthContext.Provider>
    )
}

//Hook para leer el contexto cómodamente desde cualquier componente
export function useAuth() {
    return useContext(AuthContext)
}
