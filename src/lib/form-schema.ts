// Esquema del formulario de visita preproyecto (CalcuLab)
// PROYECTOS usa las 13 secciones base
// VENTAS usa las 13 secciones base + 2 secciones comerciales

export type FieldType =
  | 'text' | 'email' | 'tel' | 'number' | 'date' | 'month' | 'time'
  | 'textarea' | 'select' | 'radio' | 'checks' | 'rating' | 'subheader'

export interface FormField {
  id: string
  label: string
  type: FieldType
  req?: boolean
  ph?: string
  hint?: string
  opts?: string[]
  // Muestra el campo solo cuando otro campo tiene uno de los valores indicados
  showIf?: { field: string; values: string[] }
}

export interface FormSection {
  id: string
  title: string
  icon: string
  soloVentas?: boolean
  fields: FormField[]
}

export const FORM_SCHEMA: FormSection[] = [
  {
    id: 's0', title: 'Datos de la Visita', icon: 'hospital',
    fields: [
      { id: 'fecha',        label: 'Fecha de la visita',           type: 'date',     req: true },
      { id: 'tecnico',      label: 'Técnico/a responsable Palex',  type: 'text',     req: true, ph: 'Nombre y apellidos' },
      { id: 'interlocutor', label: 'Interlocutor del cliente',     type: 'text',     ph: 'Nombre y apellidos' },
      { id: 'cargo',        label: 'Cargo del interlocutor',       type: 'text',     ph: 'Jefe de laboratorio, Supervisor...' },
      { id: 'email_int',    label: 'Email del interlocutor',       type: 'email' },
      { id: 'tel_int',      label: 'Teléfono del interlocutor',    type: 'tel' },
      { id: 'fase',         label: 'Fase del proyecto',            type: 'select',   opts: ['Primera visita', 'Segunda visita', 'Visita Pre-Proyecto', 'Seguimiento', 'Visita técnica'] },
      { id: 'objetivo',     label: 'Objetivo de la visita',        type: 'textarea', ph: 'Describir el propósito principal...' },
      { id: 'competencia',  label: 'Situación actual / Competencia', type: 'textarea', ph: 'Qué soluciones o proveedor usan actualmente...' },
    ]
  },
  {
    id: 's1', title: 'Extracciones y Material', icon: 'droplet',
    fields: [
      { id: 'pac_dia',         label: 'Pacientes por área/día (rutina)',      type: 'number',   ph: '0' },
      { id: 'picos',           label: 'Distribución de picos de actividad',   type: 'textarea', ph: 'Ej: 8h–10h pico máximo con ~80 pac/h...' },
      { id: 'n_puntos',        label: 'Nº de puntos de extracción',           type: 'number',   ph: '0' },
      { id: 'tipo_puntos',     label: 'Tipo de puntos de extracción',         type: 'checks',   opts: ['Mostrador general', 'Box individual', 'Sillón extracción', 'Domicilio', 'Extracción en planta', 'Urgencias', 'Otro'] },
      { id: 'ce_tubos',        label: 'Tubos de Centros Externos (vol. diario)', type: 'textarea', ph: 'Describir volumen y tipos...' },
      { id: 'materiales',      label: 'Consumo de materiales auxiliares',     type: 'textarea', ph: 'Agujas, palomillas, torniquetes… (nº/mes)' },
      { id: 'proceso',         label: 'Descripción del proceso de extracción', type: 'textarea', ph: 'Protocolos, rutas, tareas de cada rol...' },
      { id: 'contingencia',    label: 'Planes de contingencia',               type: 'textarea', ph: 'Qué hacen ante error en el flujo habitual...' },
      { id: 'planos_ok',       label: '¿Tienen planos de la zona?',           type: 'radio',    opts: ['Sí', 'No', 'Parcialmente'] },
      { id: 'instrumentacion', label: 'Instrumentación preanalítica existente', type: 'checks', opts: ['Etiquetadores', 'Dispensadores de tubos', 'Neveras', 'Sistema informático Preanalítico', 'Otros'] },
    ]
  },
  {
    id: 's2', title: 'Atención y Distribución de Pacientes', icon: 'users',
    fields: [
      { id: 'hora_ini',      label: 'Hora de apertura al público',          type: 'time' },
      { id: 'hora_fin',      label: 'Hora de cierre al público',            type: 'time' },
      { id: 'turno_tarde',   label: '¿Hay turno de tarde?',                 type: 'radio',  opts: ['Sí', 'No'] },
      { id: 'hora_tarde',    label: 'Horario de tarde (si aplica)',         type: 'text',   ph: 'Ej: 15:00 – 18:00', showIf: { field: 'turno_tarde', values: ['Sí'] } },
      { id: 'gestion_colas', label: '¿Sistema de gestión de turnos/colas?', type: 'radio',  opts: ['Sí', 'No', 'En estudio'] },
      { id: 'sistema_colas', label: 'Sistema de colas: marca/modelo',       type: 'text',   ph: 'Ej: Q-Matic, tótem propio...', showIf: { field: 'gestion_colas', values: ['Sí'] } },
      { id: 'id_recepcion',  label: 'Identificación en tótem/recepción',   type: 'checks', opts: ['NSS / CIP', 'Tarjeta sanitaria', 'DNI / NIF', 'Nombre', 'Código QR', 'Chip NFC', 'Otro'] },
      { id: 'id_extraccion', label: 'Identificación en punto de extracción', type: 'checks', opts: ['NSS / CIP', 'Tarjeta sanitaria', 'DNI / NIF', 'Nombre', 'Etiqueta previa', 'Volante', 'Otro'] },
    ]
  },
  {
    id: 's3', title: 'Citas y Peticiones', icon: 'calendar',
    fields: [
      { id: 'tipo_cita',       label: 'Tipo de cita',                       type: 'radio',    opts: ['Citados', 'A demanda', 'Mixto'] },
      { id: 'origen_agenda',   label: 'Origen de la agenda de citas',       type: 'checks',   opts: ['App Atención Primaria', 'HIS', 'LIS', 'Aplicación propia', 'Papel / teléfono', 'Portal web paciente', 'Otro'] },
      { id: 'tipos_solicitud', label: 'Tipos de solicitudes que llegan',    type: 'checks',   opts: ['Atención Primaria', 'Especializada', 'Urgencias', 'Pediatría', 'Domicilio', 'Empresa / mutua', 'Centros externos', 'Otro'] },
      { id: 'vol_peticiones',  label: 'Volumen de peticiones por tipo',     type: 'textarea', ph: 'Ej: 70% primaria, 20% especializada...' },
      { id: 'solicitud_elec',  label: '¿Petición electrónica?',             type: 'radio',    opts: ['Sí', 'No', 'Parcialmente'] },
      { id: 'sistema_elec',    label: 'Sistema de petición electrónica',    type: 'text',     ph: 'Nombre del sistema, versión...', showIf: { field: 'solicitud_elec', values: ['Sí', 'Parcialmente'] } },
      { id: 'volantes_papel',  label: '¿Se siguen usando volantes en papel?', type: 'radio',  opts: ['Sí, mayoritariamente', 'Sí, ocasionalmente', 'No'] },
    ]
  },
  {
    id: 's4', title: 'Incidencias', icon: 'alert-triangle',
    fields: [
      { id: 'tipos_incidencia',   label: 'Tipos de incidencias más frecuentes', type: 'checks',   opts: ['Hemólisis', 'Coágulo', 'Volumen insuficiente', 'Tubo incorrecto', 'Etiqueta ilegible', 'Paciente no identificado', 'Muestra no recibida', 'Rotura de tubo', 'Otro'] },
      { id: 'frec_incidencia',    label: 'Tasa estimada de incidencias',         type: 'select',   opts: ['<1%', '1–3%', '3–5%', '>5%', 'No se mide / desconocido'] },
      { id: 'estadistico',        label: '¿Disponen de estadístico?',            type: 'radio',    opts: ['Sí', 'No'] },
      { id: 'proceso_incidencia', label: 'Proceso de gestión de incidencias',    type: 'textarea', ph: 'Cómo se registran, comunican y resuelven...' },
      { id: 'sistema_registro',   label: '¿Sistema de registro de incidencias?', type: 'radio',    opts: ['Sí', 'No'] },
      { id: 'cual_registro',      label: '¿Cuál? (si aplica)',                   type: 'text',     ph: 'Nombre del sistema', showIf: { field: 'sistema_registro', values: ['Sí'] } },
    ]
  },
  {
    id: 's5', title: 'Aplicación Inlab', icon: 'monitor',
    fields: [
      { id: 'inlab_actual',    label: '¿Tienen Inlab actualmente?',             type: 'radio',  opts: ['Sí', 'No', 'Tienen Tubeti'] },
      { id: 'version_inlab',   label: 'Versión actual (si aplica)',             type: 'text',   ph: 'Ej: Inlab 5.x', showIf: { field: 'inlab_actual', values: ['Sí', 'Tienen Tubeti'] } },
      { id: 'acceso_mostrador',label: '¿Acceso a Inlab desde mostrador?',      type: 'radio',  opts: ['Sí', 'No', 'Solo muestras'] },
      { id: 'acceso_boxes',    label: '¿Acceso desde boxes de extracción?',    type: 'radio',  opts: ['Sí', 'No', 'Parcialmente'] },
      { id: 'lector_cb',       label: '¿Necesitan lector de código de barras?', type: 'radio', opts: ['Sí', 'No', 'Posiblemente'] },
      { id: 'pc_disponible',   label: '¿Disponibilidad de PC en cada ubicación?', type: 'radio', opts: ['Sí, todos', 'Parcialmente', 'No'] },
      { id: 'n_pcs',           label: 'Nº de PCs en el área',                  type: 'number', ph: '0' },
      { id: 'so_pc',           label: 'Sistema operativo de los PCs',          type: 'select', opts: ['Windows 11', 'Windows 10', 'Windows 7 / anterior', 'Desconocido'] },
    ]
  },
  {
    id: 's6', title: 'Infraestructura TI', icon: 'server',
    fields: [
      { id: 'servidor_hospital', label: '¿Posibilidad de usar servidor del hospital?', type: 'radio',    opts: ['Sí', 'No', 'Posiblemente'] },
      { id: 'espacio_servidor',  label: '¿Espacio para instalar servidor Palex?',       type: 'radio',    opts: ['Sí', 'No', 'Hay que valorar'] },
      { id: 'sistemas_sw',       label: 'Sistemas informáticos existentes',             type: 'checks',   opts: ['HIS', 'LIS', 'App Atención Primaria', 'Agendas', 'Solicitud electrónica', 'Otro'] },
      { id: 'detalle_sw',        label: 'Detalle de sistemas (nombre, versión)',        type: 'textarea', ph: 'Ej: HIS Abucasis 6.x, LIS Omega 3000...' },
      { id: 'conexiones_exist',  label: 'Conexiones existentes entre sistemas',         type: 'textarea', ph: 'Qué está conectado con qué actualmente...' },
      { id: 'conexiones_fut',    label: 'Conexiones necesarias en el futuro',           type: 'textarea', ph: 'Integración Inlab ↔ HIS, ↔ LIS, etc.' },
      { id: 'wifi',              label: 'Conectividad WiFi en el área',                 type: 'radio',    opts: ['Sí, cobertura total', 'Sí, cobertura parcial', 'No'] },
      { id: 'red_cableada',      label: 'Red cableada disponible',                      type: 'radio',    opts: ['Sí, en todos los puntos', 'Sí, en algunos puntos', 'No'] },
      { id: 'resp_ti',           label: 'Responsable TI del hospital',                  type: 'text',     ph: 'Nombre / departamento' },
      { id: 'contacto_ti',       label: 'Contacto TI (email o teléfono)',               type: 'text',     ph: '' },
    ]
  },
  {
    id: 's7', title: 'Impresoras Zebra', icon: 'printer',
    fields: [
      { id: 'zebra_actual',  label: '¿Tienen impresoras Zebra actualmente?',      type: 'radio',    opts: ['Sí', 'No'] },
      { id: 'modelo_zebra',  label: 'Modelos actuales (si aplica)',               type: 'text',     ph: 'Ej: ZD420, ZD620...', showIf: { field: 'zebra_actual', values: ['Sí'] } },
      { id: 'n_zebra',       label: 'Nº de impresoras Zebra necesarias',          type: 'number',   ph: '0' },
      { id: 'dist_zebra',    label: 'Distribución prevista',                      type: 'textarea', ph: 'Ej: 1 en mostrador, 1 en cada box...' },
      { id: 'red_zebra',     label: '¿Conexión de red en cada punto?',            type: 'radio',    opts: ['Sí, todos', 'Parcialmente', 'No'] },
      { id: 'elec_zebra',    label: '¿Toma eléctrica en cada punto?',             type: 'radio',    opts: ['Sí, todos', 'Parcialmente', 'No'] },
      { id: 'espacio_zebra', label: '¿Espacio físico para impresora?',            type: 'radio',    opts: ['Sí, todos', 'Parcialmente', 'No'] },
    ]
  },
  {
    id: 's8', title: 'BC Robo', icon: 'cpu',
    fields: [
      { id: 'bcrobo_actual',  label: '¿Tienen BC Robo actualmente?',            type: 'radio',    opts: ['Sí', 'No'] },
      { id: 'modelo_bcrobo',  label: 'Modelo sugerido según volumen',            type: 'select',   opts: ['BC Robo 900', 'BC Robo 7', 'BC Robo 8001', 'Por determinar'] },
      { id: 'n_bcrobo',       label: 'Nº de dispositivos BC Robo necesarios',   type: 'number',   ph: '0' },
      { id: 'ubicacion_bcr',  label: 'Ubicación prevista',                       type: 'textarea', ph: 'Sala, planta, boxes, recepción...' },
      { id: 'red_bcrobo',     label: '¿Toma de red en ubicación?',              type: 'radio',    opts: ['Sí', 'No', 'Hay que instalar'] },
      { id: 'elec_bcrobo',    label: '¿Toma eléctrica disponible?',             type: 'radio',    opts: ['Sí', 'No', 'Hay que instalar'] },
      { id: 'm2_bcrobo',      label: 'Espacio físico disponible (m²)',           type: 'number',   ph: '0' },
      { id: 'acceso_bcrobo',  label: '¿Acceso para instalación?',               type: 'radio',    opts: ['Sin restricciones', 'Con restricciones horarias', 'CAES', 'Solicitar autorización'] },
    ]
  },
  {
    id: 's_termo', title: 'Neveras y Termografía', icon: 'thermometer',
    fields: [
      // ── Bloque 1: Sistema ──────────────────────────────────────────
      { id: 'sh_sistema',  label: 'Sistema',                      type: 'subheader' },
      {
        id: 'termo_tipo',
        label: 'Tipo de sistema a implantar',
        type: 'radio',
        req: true,
        opts: ['Solo temperatura (RFID)', 'Solo ubicación (BT)', 'Temperatura y ubicación'],
        hint: 'Determina qué hardware se necesita: sensor BT, reader RFID o ambos'
      },
      {
        id: 'termo_n_rutas',
        label: 'Nº de rutas de recogida',
        type: 'number',
        req: true,
        ph: '0',
        hint: 'Cada ruta es un circuito independiente que parte del laboratorio y visita varios centros'
      },
      {
        id: 'termo_rutas_detalle',
        label: 'Detalle por ruta',
        type: 'textarea',
        ph: 'Ruta 1 — 6 pueblos · 3 neveras\nRuta 2 — 4 pueblos · 2 neveras\n...',
        hint: 'Una línea por ruta: nombre o nº de ruta, pueblos que cubre y neveras asignadas'
      },
      {
        id: 'termo_total_neveras',
        label: 'Total de neveras necesarias',
        type: 'number',
        ph: '0',
        hint: 'Suma total de neveras en todas las rutas'
      },
      // ── Bloque 2: Infraestructura — Centros de Salud ──────────────
      { id: 'sh_cs',  label: 'Infraestructura — Centros de Salud', type: 'subheader' },
      {
        id: 'cs_toma_datos',
        label: 'Toma de datos en centros de salud',
        type: 'radio',
        opts: ['Sí, en todos', 'Sí, en cabeceras', 'No', 'Por instalar'],
        hint: 'Necesaria para conectar el Gateway Bluetooth en cada centro o cabecera de zona'
      },
      {
        id: 'cs_toma_corriente',
        label: 'Toma de corriente en centros de salud',
        type: 'radio',
        opts: ['Sí, en todos', 'Sí, en cabeceras', 'No', 'Por instalar'],
        hint: 'El Gateway BT requiere alimentación eléctrica en el punto de instalación'
      },
      // ── Bloque 3: Infraestructura — Laboratorio ───────────────────
      { id: 'sh_lab',  label: 'Infraestructura — Laboratorio',    type: 'subheader' },
      {
        id: 'lab_tomas_datos',
        label: 'Tomas de datos en laboratorio',
        type: 'radio',
        opts: ['Sí (3 disponibles)', 'Parcialmente', 'No', 'Por instalar'],
        hint: 'Se necesitan 3 tomas: una para el Reader RFID, una para el Gateway BT y una para el mini-PC'
      },
      {
        id: 'lab_tomas_corriente',
        label: 'Tomas de corriente en laboratorio',
        type: 'radio',
        opts: ['Sí (3–4 disponibles)', 'Parcialmente', 'No', 'Por instalar'],
        hint: 'Se necesitan entre 3 y 4 enchufes: Reader RFID, Gateway BT, mini-PC (y pantalla si aplica)'
      },
      {
        id: 'termo_obs',
        label: 'Observaciones de infraestructura',
        type: 'textarea',
        ph: 'Incidencias detectadas, restricciones de obra, accesos condicionados…'
      },
    ]
  },
  {
    id: 's9', title: 'Etiquetado', icon: 'tag',
    fields: [
      { id: 'etiq_metodo',     label: 'Método actual de etiquetado',       type: 'select', opts: ['Manual (bolígrafo)', 'Impresora A4 por punto', 'Tubo preetiquetado', 'Planilla preimpresa', 'Sin sistema definido'] },
      { id: 'prefijos',        label: 'Prefijos utilizados',               type: 'text',   ph: 'Ej: LAB-, EXT-, URG-…' },
      { id: 'tipo_cb',         label: 'Tipo de código de barras',          type: 'checks', opts: ['1D Code 39', '1D Code 128', '2D QR', 'Codabar', 'Otro'] },
      { id: 'info_etiq',       label: 'Información en la etiqueta',        type: 'checks', opts: ['Nombre del paciente', 'Fecha nacimiento', 'NSS / CIP', 'Nº Historia Clínica', 'Fecha y hora', 'Tipo de muestra', 'Nº de Lab', 'Origen/Destino', 'Nº de petición', 'Hab/Cama'] },
      { id: 'tam_etiq',        label: 'Tamaño actual de etiqueta',         type: 'text',   ph: 'Ej: 25×10 mm, 40×25 mm…' },
      { id: 'etiq_especiales', label: '¿Etiquetas especiales?',            type: 'radio',  opts: ['Sí', 'No'] },
      { id: 'desc_etiq_esp',   label: 'Descripción etiquetas especiales',  type: 'textarea', ph: 'Peligroso, cadena de frío, urgente...', showIf: { field: 'etiq_especiales', values: ['Sí'] } },
    ]
  },
  {
    id: 's10', title: 'Casos Especiales', icon: 'alert-circle',
    fields: [
      { id: 'pacientes_esp',   label: '¿Áreas con pacientes especiales?',  type: 'radio',    opts: ['Sí', 'No'] },
      { id: 'tipos_esp',       label: 'Tipos de pacientes especiales',      type: 'checks',   opts: ['Infecciosos (aislamiento)', 'Sepsis', 'Oncología', 'Pediatría', 'Inmunodeprimidos', 'Trasplantados', 'Neonatos', 'Lactantes', 'Otro'], showIf: { field: 'pacientes_esp', values: ['Sí'] } },
      { id: 'desc_areas_esp',  label: 'Descripción de las áreas especiales', type: 'textarea', ph: 'Ubicación, flujos específicos, personal...', showIf: { field: 'pacientes_esp', values: ['Sí'] } },
      { id: 'protocolos_seg',  label: '¿Protocolos especiales de seguridad?', type: 'radio',  opts: ['Sí', 'No'], showIf: { field: 'pacientes_esp', values: ['Sí'] } },
      { id: 'desc_protocolos', label: 'Descripción de protocolos',          type: 'textarea', ph: 'EPI requerido, flujos especiales...', showIf: { field: 'protocolos_seg', values: ['Sí'] } },
    ]
  },
  {
    id: 's11', title: 'Usuarios y Accesos', icon: 'lock',
    fields: [
      { id: 'ldap',           label: '¿Inlab con Directorio Activo / LDAP?', type: 'radio',    opts: ['Sí', 'No', 'Por definir'] },
      { id: 'n_accesos',      label: 'Nº de accesos a Inlab necesarios',     type: 'number',   ph: '0' },
      { id: 'roles',          label: 'Roles previstos',                       type: 'checks',   opts: ['Administrador', 'Supervisor', 'Extractor', 'Solo consulta', 'Mostrador', 'Dashboard'] },
      { id: 'politica_pass',  label: 'Política de contraseñas del hospital',  type: 'textarea', ph: 'Longitud mínima, caducidad, requisitos...' },
      { id: 'acceso_remoto',  label: '¿Posibilidad de acceso remoto?',       type: 'radio',    opts: ['Sí', 'No', 'Bajo petición'] },
    ]
  },
  {
    id: 's12', title: 'Valoración y Próximos Pasos', icon: 'award',
    fields: [
      { id: 'valoracion',     label: 'Valoración general (1–5)',            type: 'rating' },
      { id: 'interes',        label: 'Nivel de interés del cliente',        type: 'select',   opts: ['Muy alto – quieren avanzar ya', 'Alto – interés claro', 'Medio – en estudio', 'Bajo – poco interés'] },
      { id: 'madurez',        label: 'Madurez del proyecto',               type: 'select',   opts: ['Muy avanzado (presupuesto aprobado)', 'Avanzado (en proceso)', 'En estudio', 'Muy inicial (exploración)'] },
      { id: 'puntos_crit',    label: 'Puntos críticos detectados',         type: 'textarea', ph: 'Obstáculos técnicos, organizativos, económicos...' },
      { id: 'observaciones',  label: 'Observaciones generales',            type: 'textarea', ph: 'Cualquier anotación relevante...' },
      { id: 'prox_pasos',     label: 'Próximos pasos acordados',           type: 'textarea', ph: 'Ej: Enviar oferta técnica antes del 30/04...' },
      { id: 'fecha_contacto', label: 'Fecha prevista de siguiente contacto', type: 'date' },
      { id: 'fecha_inicio',   label: 'Fecha estimada de inicio de proyecto', type: 'month' },
      { id: 'redactor',       label: 'Nombre del redactor del informe',    type: 'text',     ph: '' },
      { id: 'fecha_redacc',   label: 'Fecha de redacción del informe',     type: 'date' },
    ]
  },
  // ── SECCIONES EXCLUSIVAS DE VENTAS ──────────────────────
  {
    id: 's13', title: 'Contexto Comercial', icon: 'briefcase', soloVentas: true,
    fields: [
      { id: 'temas_tratados',   label: 'Temas tratados en la visita',        type: 'textarea', ph: 'Productos presentados, necesidades detectadas...' },
      { id: 'productos_interes',label: 'Productos de interés para el cliente', type: 'checks',  opts: ['Inlab', 'BC Robo 900', 'BC Robo 7', 'BC Robo 8001', 'Zebra', 'Tubeti', 'Otro'] },
      { id: 'presupuesto_com',  label: 'Presupuesto discutido / estimado',   type: 'select',   opts: ['< 50.000 €', '50.000 – 100.000 €', '100.000 – 200.000 €', '200.000 – 500.000 €', '> 500.000 €', 'No discutido'] },
      { id: 'oportunidad',      label: 'Nivel de oportunidad',               type: 'radio',    opts: ['Alta', 'Media', 'Baja'] },
      { id: 'prob_cierre',      label: 'Probabilidad de cierre (%)',         type: 'select',   opts: ['<25%', '25–50%', '50–75%', '>75%'] },
      { id: 'plazo_decision',   label: 'Plazo previsto de decisión',         type: 'select',   opts: ['< 1 mes', '1–3 meses', '3–6 meses', '6–12 meses', '> 12 meses', 'Desconocido'] },
      { id: 'decision_makers',  label: 'Decisores identificados',            type: 'textarea', ph: 'Nombre, cargo y nivel de influencia...' },
      { id: 'competencia_com',  label: 'Competencia activa en este centro',  type: 'textarea', ph: 'Qué otras empresas están presentes...' },
    ]
  },
  {
    id: 's14', title: 'Solicitudes del Cliente', icon: 'pen-line', soloVentas: true,
    fields: [
      { id: 'tiene_proyecto',    label: '¿Hay proyecto activo en este centro?', type: 'radio',    opts: ['Sí', 'No'] },
      { id: 'proyecto_detalle',  label: 'Detalle del proyecto activo',          type: 'textarea', ph: 'Nombre del proyecto, estado, productos instalados...', showIf: { field: 'tiene_proyecto', values: ['Sí'] } },
      { id: 'solicitudes',       label: 'Solicitudes del cliente',              type: 'textarea', ph: 'Qué pide exactamente el cliente...' },
      { id: 'tipo_solicitud',    label: 'Tipo de solicitud',                    type: 'checks',   opts: ['Nueva instalación', 'Modificación', 'Ampliación', 'Soporte técnico', 'Formación', 'Presupuesto', 'Demo', 'Otro'] },
      { id: 'urgencia',          label: 'Urgencia',                             type: 'radio',    opts: ['Alta', 'Media', 'Baja'] },
      { id: 'compromisos',       label: 'Compromisos adquiridos con el cliente', type: 'textarea', ph: 'Qué nos hemos comprometido a hacer y cuándo...' },
      { id: 'prox_pasos_com',    label: 'Próximas acciones comerciales',        type: 'textarea', ph: 'Enviar oferta, convocar demo, visita técnica...' },
    ]
  },
]

// Filtra las secciones según el tipo de visita
export function getSections(tipo: 'PROYECTOS' | 'VENTAS'): FormSection[] {
  if (tipo === 'VENTAS') return FORM_SCHEMA
  return FORM_SCHEMA.filter(s => !s.soloVentas)
}

// Inicializa el estado vacío del formulario
export function initFormData(tipo: 'PROYECTOS' | 'VENTAS'): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  getSections(tipo).forEach(s =>
    s.fields.forEach(f => {
      if (f.type === 'subheader') return
      data[f.id] = f.type === 'checks' ? [] : f.type === 'rating' ? 0 : ''
    })
  )
  return data
}
