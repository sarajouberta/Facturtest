import Dexie from 'dexie'

//base de datos local (vive en el navegador del móvil)
export const db = new Dexie('FacturtestDB')

//"esquema": qué tablas hay y qué campos se pueden indexar
db.version(1).stores({  // "create table"
facturas: '++id, numero, fecha',
config: 'id',
})
