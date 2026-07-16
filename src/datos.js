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
  // Todas las facturas del usuario. undefined mientras carga.
  export function useFacturas() {
    const { usuario } = useAuth()
    const [facturas, setFacturas] = useState(undefined)

    useEffect(() => {
      if (!usuario) { setFacturas(undefined); return }
      const unsub = onSnapshot(refFacturas(usuario.uid), (snap) => {
        setFacturas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, (error) => console.error('❌ Firestore useFacturas:', error))
      return unsub
    }, [usuario])

    return facturas
  }

  // Una factura por su id (texto). undefined mientras carga o si no existe.
  export function useFactura(id) {
    const { usuario } = useAuth()
    const [factura, setFactura] = useState(undefined)
  
    useEffect(() => {
      if (!usuario || !id) { setFactura(undefined); return }
      const ref = doc(firestore, 'users', usuario.uid, 'facturas', id)
      const unsub = onSnapshot(ref, (snap) => {
        setFactura(snap.exists() ? { id: snap.id, ...snap.data() } : undefined)
      }, (error) => console.error('❌ Firestore useFactura:', error))
      return unsub
    }, [usuario, id])

    return factura
  }
// Datos del taller. undefined mientras carga; null si aún no hay config.
  export function useConfig() {
    const { usuario } = useAuth()
    const [config, setConfig] = useState(undefined)

    useEffect(() => {
      if (!usuario) { setConfig(undefined); return }
      const unsub = onSnapshot(refConfig(usuario.uid), (snap) => {
        setConfig(snap.exists() ? snap.data() : null)
      }, (error) => console.error('❌ Firestore useConfig:', error))
      return unsub
    }, [usuario])

    return config
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
