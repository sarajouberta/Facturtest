// Capa de datos de la app: todo lo que toca Firestore vive aquí.
  // Sustituye al antiguo db.js (Dexie). Los datos cuelgan de cada usuario:
  //   users/{uid}/facturas/{id}   y   users/{uid}/config/taller
  import { useEffect, useState } from 'react'
  import { collection, doc, addDoc, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore'
  import { auth, firestore } from './firebase'
  import { useAuth } from './auth/AuthContext'
  
  // --- Referencias: dónde viven los datos de un usuario ---
  const refFacturas = (uid) => collection(firestore, 'users', uid, 'facturas')
  const refConfig = (uid) => doc(firestore, 'users', uid, 'config', 'taller')

  // uid del usuario actual (las acciones se llaman ya logueada)
  function uidActual() {
    const u = auth.currentUser
    if (!u) throw new Error('No hay usuario logueado')
    return u.uid
  }

// --- LECTURA: hooks que se repintan solos (como useLiveQuery) ---

/*Nota: custom hook: fabricar personalizados juntando los de React (ej.useFacturas(): por dentro combina useAuth + useState + useEffect, y por fuera se usa como uno más)
  const facturas = useFacturas()   //una línea, y se repinta solo
  La convención use: es lo que le dice a React (y al linter) "esto es un hook, hazle cumplir las reglas de arriba".

 */
  /* Los tres hooks devuelven { dato, error }. El error hace falta porque, si solo
     se devolviera el dato, un fallo de Firestore sería indistinguible de "todavía
     cargando": el estado se quedaba en undefined, la pantalla mostraba "Cargando…"
     para siempre y el motivo solo aparecía en la consola — que en un móvil no
     existe. Estados posibles del dato:
       undefined → cargando  |  null → no existe  |  valor → dato cargado  */

  // Todas las facturas del usuario.
  export function useFacturas() {
    const { usuario } = useAuth()
    const [facturas, setFacturas] = useState(undefined)
    const [error, setError] = useState(null)

    useEffect(() => {
      if (!usuario) { setFacturas(undefined); return }
      const unsub = onSnapshot(refFacturas(usuario.uid), (snap) => {
        setError(null)
        setFacturas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, (e) => {
        console.error('❌ Firestore useFacturas:', e)
        setError(e)
      })
      return unsub
    }, [usuario])

    return { facturas, error }
  }

  /* Una factura por su id (texto).
     null = no existe (borrada, o un enlace a una que ya no está). Antes devolvía
     undefined también en ese caso, así que la pantalla no podía distinguirlo de
     "cargando" y se quedaba colgada para siempre. Es el mismo truco del null
     explícito que ya usaba useConfig. */
  export function useFactura(id) {
    const { usuario } = useAuth()
    const [factura, setFactura] = useState(undefined)
    const [error, setError] = useState(null)

    useEffect(() => {
      if (!usuario || !id) { setFactura(undefined); return }
      const ref = doc(firestore, 'users', usuario.uid, 'facturas', id)
      const unsub = onSnapshot(ref, (snap) => {
        setError(null)
        setFactura(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      }, (e) => {
        console.error('❌ Firestore useFactura:', e)
        setError(e)
      })
      return unsub
    }, [usuario, id])

    return { factura, error }
  }
// Datos del taller. undefined mientras carga; null si aún no hay config.
  export function useConfig() {
    const { usuario } = useAuth()
    const [config, setConfig] = useState(undefined)
    const [error, setError] = useState(null)

    useEffect(() => {
      if (!usuario) { setConfig(undefined); return }
      const unsub = onSnapshot(refConfig(usuario.uid), (snap) => {
        setError(null)
        setConfig(snap.exists() ? snap.data() : null)
      }, (e) => {
        console.error('❌ Firestore useConfig:', e)
        setError(e)
      })
      return unsub
    }, [usuario])

    return { config, error }
  }

  // --- ESCRITURA: acciones ---

  export function crearFactura(datos) {
    return addDoc(refFacturas(uidActual()), datos)
  }

  export function borrarFactura(id) {
    return deleteDoc(doc(firestore, 'users', uidActual(), 'facturas', id))
  }

  export function guardarConfig(datos) {
    return setDoc(refConfig(uidActual()), datos)
  }
