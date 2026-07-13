
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null)     //null = nadie logueado
    const [cargando, setCargando] = useState(true)   //true mientras Firebase comprueba si ya había sesión

    /*patrón del useEffect: suscribirse al montar y devolver la función de baja para limpiar. 
    Es el mismo onAuthStateChanged el que devuelve esa función de desuscripción.
    Sin eso, habría fugas de memoria */
    useEffect(() => {
        // Firebase nos avisa de cada cambio de sesión (entrar, salir, recargar la página)
        const desuscribir = onAuthStateChanged(auth, (u) => {
            setUsuario(u)
            setCargando(false)
        })
        return desuscribir   //limpieza: nos damos de baja al desmontar
    }, [])

    const entrar = () => signInWithPopup(auth, googleProvider)
    const salir = () => signOut(auth)

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
