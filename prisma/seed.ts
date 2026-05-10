// Seed de datos de prueba para Palex Medical
// Ejecutar con: npm run db:seed
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  console.log("Limpiando datos existentes...")
  await db.oportunidad.deleteMany()
  await db.visita.deleteMany()
  await db.contacto.deleteMany()
  await db.usuarioZona.deleteMany()
  await db.hospital.deleteMany()
  await db.zona.deleteMany()
  await db.usuario.deleteMany()

  console.log("Creando zonas...")
  const [zonaNorte, zonaCentro, zonaSur, zonaLevante] = await Promise.all([
    db.zona.create({ data: { nombre: "Zona Norte", descripcion: "Pais Vasco, Navarra, Aragon, Cataluna" } }),
    db.zona.create({ data: { nombre: "Zona Centro", descripcion: "Madrid, Castilla y Leon, Castilla-La Mancha" } }),
    db.zona.create({ data: { nombre: "Zona Sur", descripcion: "Andalucia, Extremadura, Murcia" } }),
    db.zona.create({ data: { nombre: "Zona Levante", descripcion: "Comunidad Valenciana, Baleares" } }),
  ])

  console.log("Creando usuarios...")
  const hashAdmin    = await bcrypt.hash("Acapulco.70",  12)
  const hashVentas   = await bcrypt.hash("Palex.2024!",  12)
  const hashProy1    = await bcrypt.hash("Palex.2024!",  12)
  const hashProy2    = await bcrypt.hash("Palex.2024!",  12)
  const hashVentas2  = await bcrypt.hash("Palex.2024!",  12)

  const [admin, carlos, maria, pedro, lucia] = await Promise.all([
    db.usuario.create({ data: { nombre: "Admin Palex", email: "admin@palex.com", password: hashAdmin, rol: "ADMIN" } }),
    db.usuario.create({ data: { nombre: "Carlos Mendez", email: "carlos@palex.com", password: hashVentas, rol: "VENTAS" } }),
    db.usuario.create({ data: { nombre: "Maria Garcia", email: "maria@palex.com", password: hashProy1, rol: "PROYECTOS" } }),
    db.usuario.create({ data: { nombre: "Pedro Sanchez", email: "pedro@palex.com", password: hashProy2, rol: "PROYECTOS" } }),
    db.usuario.create({ data: { nombre: "Lucia Torres", email: "lucia@palex.com", password: hashVentas2, rol: "VENTAS" } }),
  ])

  // Asignar zonas a usuarios
  await db.usuarioZona.createMany({
    data: [
      { usuarioId: carlos.id, zonaId: zonaCentro.id },
      { usuarioId: carlos.id, zonaId: zonaNorte.id },
      { usuarioId: lucia.id,  zonaId: zonaSur.id },
      { usuarioId: lucia.id,  zonaId: zonaLevante.id },
      { usuarioId: maria.id,  zonaId: zonaCentro.id },
      { usuarioId: pedro.id,  zonaId: zonaNorte.id },
    ],
  })

  console.log("Creando hospitales...")
  const hospitales = await Promise.all([
    // Zona Centro
    db.hospital.create({ data: { nombre: "Hospital La Paz",            ciudad: "Madrid",    provincia: "Madrid",    tipo: "HOSPITAL_PUBLICO",  camas: 1400, zonaId: zonaCentro.id } }),
    db.hospital.create({ data: { nombre: "Hospital Gregorio Maranon",  ciudad: "Madrid",    provincia: "Madrid",    tipo: "HOSPITAL_PUBLICO",  camas: 1550, zonaId: zonaCentro.id } }),
    db.hospital.create({ data: { nombre: "Clinica Ruber Internacional", ciudad: "Madrid",   provincia: "Madrid",    tipo: "CLINICA_PRIVADA",   camas: 220,  zonaId: zonaCentro.id } }),
    db.hospital.create({ data: { nombre: "Hospital Rio Hortega",        ciudad: "Valladolid",provincia: "Valladolid",tipo: "HOSPITAL_PUBLICO",  camas: 670,  zonaId: zonaCentro.id } }),
    // Zona Norte
    db.hospital.create({ data: { nombre: "Hospital Cruces",             ciudad: "Bilbao",   provincia: "Vizcaya",   tipo: "HOSPITAL_PUBLICO",  camas: 980,  zonaId: zonaNorte.id } }),
    db.hospital.create({ data: { nombre: "Hospital Donostia",           ciudad: "San Sebastian", provincia: "Guipuzcoa", tipo: "HOSPITAL_PUBLICO", camas: 820, zonaId: zonaNorte.id } }),
    db.hospital.create({ data: { nombre: "Clinica Quiron Bilbao",       ciudad: "Bilbao",   provincia: "Vizcaya",   tipo: "CLINICA_PRIVADA",   camas: 180,  zonaId: zonaNorte.id } }),
    // Zona Sur
    db.hospital.create({ data: { nombre: "Hospital Virgen del Rocio",   ciudad: "Sevilla",  provincia: "Sevilla",   tipo: "HOSPITAL_PUBLICO",  camas: 1620, zonaId: zonaSur.id } }),
    db.hospital.create({ data: { nombre: "Hospital Regional de Malaga", ciudad: "Malaga",   provincia: "Malaga",    tipo: "HOSPITAL_PUBLICO",  camas: 860,  zonaId: zonaSur.id } }),
    db.hospital.create({ data: { nombre: "Quironsalud Marbella",        ciudad: "Marbella", provincia: "Malaga",    tipo: "CLINICA_PRIVADA",   camas: 150,  zonaId: zonaSur.id } }),
    // Zona Levante
    db.hospital.create({ data: { nombre: "Hospital La Fe",              ciudad: "Valencia", provincia: "Valencia",  tipo: "HOSPITAL_PUBLICO",  camas: 1600, zonaId: zonaLevante.id } }),
    db.hospital.create({ data: { nombre: "Hospital General de Valencia", ciudad: "Valencia", provincia: "Valencia", tipo: "HOSPITAL_PUBLICO",  camas: 640,  zonaId: zonaLevante.id } }),
    db.hospital.create({ data: { nombre: "Laboratorio Echevarne",        ciudad: "Valencia", provincia: "Valencia", tipo: "LABORATORIO",       camas: null, zonaId: zonaLevante.id } }),
  ])

  const [hLaPaz, hGregorio, hRuber, hRioHortega, hCruces, hDonostia, hQuironBilbao, hRocio, hMalaga, hMarbella, hLaFe, hGeneral, hLaboratorio] = hospitales

  console.log("Creando contactos...")
  await db.contacto.createMany({
    data: [
      { hospitalId: hLaPaz.id,    nombre: "Dr. Antonio Vega",    cargo: "Jefe de Laboratorio",   email: "avega@lapaz.es",      telefono: "910001001", principal: true  },
      { hospitalId: hLaPaz.id,    nombre: "Elena Ruiz",          cargo: "Supervisora de Compras", email: "eruiz@lapaz.es",     telefono: "910001002", principal: false },
      { hospitalId: hGregorio.id, nombre: "Dra. Carmen Lopez",   cargo: "Directora de Analitica", email: "clopez@hgm.es",     telefono: "910002001", principal: true  },
      { hospitalId: hCruces.id,   nombre: "Dr. Inigo Urrutia",   cargo: "Responsable Preанalitica", email: "iurrutia@cruces.eus", telefono: "944001001", principal: true },
      { hospitalId: hRocio.id,    nombre: "Dr. Manuel Jimenez",  cargo: "Jefe de Servicio",      email: "mjimenez@rocio.es",   telefono: "955001001", principal: true  },
      { hospitalId: hLaFe.id,     nombre: "Dra. Rosa Martinez",  cargo: "Coordinadora Laboratorio", email: "rmartinez@lafe.es", telefono: "961001001", principal: true },
      { hospitalId: hLaFe.id,     nombre: "Jordi Blasco",        cargo: "Tecnico Responsable",   email: "jblasco@lafe.es",     telefono: "961001002", principal: false },
    ],
  })

  console.log("Creando oportunidades...")
  await db.oportunidad.createMany({
    data: [
      {
        hospitalId: hLaPaz.id, usuarioId: carlos.id,
        titulo: "Implantacion sistema preanalítico UCI", etapa: "NEGOCIACION",
        valorEstimado: 85000, probabilidad: 70,
        fechaCierre: new Date("2025-09-30"),
        productos: ["Sistema BEXEN", "Racks de muestras", "Formacion"],
        notas: "Reunion con Dr. Vega muy positiva. Esperando firma del responsable de compras.",
      },
      {
        hospitalId: hGregorio.id, usuarioId: carlos.id,
        titulo: "Renovacion tubos vacutainer planta 2-4", etapa: "PROPUESTA",
        valorEstimado: 42000, probabilidad: 50,
        fechaCierre: new Date("2025-10-15"),
        productos: ["Tubos Vacutainer", "Etiquetadoras"],
        notas: "Propuesta enviada el 15 de julio. Pendiente respuesta del departamento.",
      },
      {
        hospitalId: hRuber.id, usuarioId: carlos.id,
        titulo: "Equipamiento laboratorio ampliacion", etapa: "PRIMERA_VISITA",
        valorEstimado: 120000, probabilidad: 25,
        fechaCierre: new Date("2025-12-31"),
        productos: ["Centrifugas", "Sistema BEXEN", "Software LIS"],
        notas: "Primera toma de contacto. Clinica en proceso de expansion.",
      },
      {
        hospitalId: hCruces.id, usuarioId: carlos.id,
        titulo: "Contrato mantenimiento anual centrifugas", etapa: "GANADO",
        valorEstimado: 18000, probabilidad: 100,
        fechaCierre: new Date("2025-07-01"),
        productos: ["Mantenimiento"],
        notas: "Contrato firmado. Factura emitida.",
      },
      {
        hospitalId: hRocio.id, usuarioId: lucia.id,
        titulo: "Sistema transporte neumatico muestras", etapa: "IDENTIFICADO",
        valorEstimado: 200000, probabilidad: 10,
        fechaCierre: new Date("2026-03-31"),
        productos: ["Sistema BEXEN", "Neveras transporte"],
        notas: "Hospital en obras de ampliacion. Oportunidad a largo plazo.",
      },
      {
        hospitalId: hMalaga.id, usuarioId: lucia.id,
        titulo: "Renovacion completa preanalítica urgencias", etapa: "PROPUESTA",
        valorEstimado: 65000, probabilidad: 55,
        fechaCierre: new Date("2025-11-30"),
        productos: ["Racks de muestras", "Etiquetadoras", "Formacion"],
        notas: "Jefe de urgencias muy interesado. Presupuesto enviado.",
      },
      {
        hospitalId: hMarbella.id, usuarioId: lucia.id,
        titulo: "Equipamiento nuevo laboratorio privado", etapa: "PERDIDO",
        valorEstimado: 95000, probabilidad: 0,
        productos: ["Centrifugas", "Sistema BEXEN"],
        motivoPerdida: "Eligieron a proveedor local con mejor precio. Revisar competitividad tarifas.",
      },
      {
        hospitalId: hLaFe.id, usuarioId: lucia.id,
        titulo: "Modernizacion linea preanalítica planta 3", etapa: "NEGOCIACION",
        valorEstimado: 78000, probabilidad: 75,
        fechaCierre: new Date("2025-09-15"),
        productos: ["Sistema BEXEN", "Software LIS", "Formacion"],
        notas: "Muy avanzado. Dra. Martinez confirmo disponibilidad presupuestaria.",
      },
    ],
  })

  console.log("Creando visitas de prueba...")
  await db.visita.createMany({
    data: [
      { hospitalId: hLaPaz.id,    usuarioId: carlos.id, tipo: "VENTAS",    estado: "COMPLETADA", datos: { observaciones: "Reunion productiva con el jefe de laboratorio." } },
      { hospitalId: hGregorio.id, usuarioId: carlos.id, tipo: "VENTAS",    estado: "COMPLETADA", datos: { observaciones: "Presentacion del catalogo 2025." } },
      { hospitalId: hRuber.id,    usuarioId: carlos.id, tipo: "VENTAS",    estado: "BORRADOR",   datos: {} },
      { hospitalId: hCruces.id,   usuarioId: maria.id,  tipo: "PROYECTOS", estado: "COMPLETADA", datos: { observaciones: "Instalacion centrifugas completada." } },
      { hospitalId: hDonostia.id, usuarioId: pedro.id,  tipo: "PROYECTOS", estado: "COMPLETADA", datos: { observaciones: "Revision sistema existente." } },
      { hospitalId: hRocio.id,    usuarioId: lucia.id,  tipo: "VENTAS",    estado: "COMPLETADA", datos: { observaciones: "Primera visita al hospital. Muy buena acogida." } },
      { hospitalId: hMalaga.id,   usuarioId: lucia.id,  tipo: "VENTAS",    estado: "COMPLETADA", datos: { observaciones: "Reunion con jefe de urgencias." } },
      { hospitalId: hLaFe.id,     usuarioId: lucia.id,  tipo: "VENTAS",    estado: "COMPLETADA", datos: { observaciones: "Demostracion del sistema BEXEN." } },
      { hospitalId: hGeneral.id,  usuarioId: lucia.id,  tipo: "VENTAS",    estado: "BORRADOR",   datos: {} },
      { hospitalId: hLaboratorio.id, usuarioId: lucia.id, tipo: "VENTAS",  estado: "BORRADOR",   datos: {} },
    ],
  })

  console.log("\n=== SEED COMPLETADO ===")
  console.log("Zonas:       4")
  console.log("Usuarios:    5")
  console.log("Hospitales:  13")
  console.log("Contactos:   7")
  console.log("Oportunidades: 8")
  console.log("Visitas:     10")
  console.log("\nCredenciales:")
  console.log("  admin@palex.com   /  Acapulco.70   (ADMIN)")
  console.log("  carlos@palex.com  /  Palex.2024!   (VENTAS - Zona Centro + Norte)")
  console.log("  lucia@palex.com   /  Palex.2024!   (VENTAS - Zona Sur + Levante)")
  console.log("  maria@palex.com   /  Palex.2024!   (PROYECTOS - Zona Centro)")
  console.log("  pedro@palex.com   /  Palex.2024!   (PROYECTOS - Zona Norte)")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
