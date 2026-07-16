//Inicialización de Firebase para toda la app (se ejecuta una sola vez): cambio para que funcione offline
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
//import { getFirestore } from 'firebase/firestore'
//persistencia local: initializeFirestore es como getFirestore pero admite arg. con la config.
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  } from 'firebase/firestore'


/*Las claves vienen de variables de entorno (.env.local). Vite solo expone al
navegador las que empiezan por VITE_. No son secretas (viajan en cualquier app
web), pero se centralizan aquí y se mantienen fuera del código. */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

//Servicios que usaremos en el resto de la app:
export const auth = getAuth(app)            // login
export const googleProvider = new GoogleAuthProvider()
//Firestore con caché local: funciona offline y sincroniza solo al recuperar red
  export const firestore = initializeFirestore(app, {
    //"guarda copia en disco": indexedDB como Dexie, que sobrevive al cerrar la app
    localCache: persistentLocalCache({
      //si se abriera + de 1 pestaña, usan la misma copia local sin pelearse
      tabManager: persistentMultipleTabManager(),
    }),
  })
