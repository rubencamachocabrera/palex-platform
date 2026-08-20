export const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}
export const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA: "bg-gray-100 text-gray-400",
}

export interface Foto { id: string; name: string; data: string; caption: string }
export type FotosMap = Record<string, Foto[]>

export interface ProyectoItem { id: string; titulo: string; estado: string; fases: { estado: string }[] }
export interface ContactoItem { id: string; nombre: string; cargo: string | null }

export interface VisitaData {
  id: string; titulo?: string | null; estado: string; tipo: string; fecha: string; editadoEn?: string
  proyectoId?: string | null
  proyecto?: ProyectoItem | null
  contactoPrincipalId?: string | null
  contactoPrincipal?: ContactoItem | null
  datos: Record<string, unknown>
  hospital: { id: string; nombre: string; ciudad: string; provincia?: string | null }
  usuario: { id: string; nombre: string }
  tags?: { tag: { id: string; nombre: string; color: string } }[]
}

// ─── Form Reducer ────────────────────────────────────────────────────────────

export interface FormState {
  visita: VisitaData | null
  datos: Record<string, unknown>
  loading: boolean
  saving: boolean
  savedAt: Date | null
  pendiente: boolean
  saveError: boolean
  cambiandoEstado: boolean
}

export type FormAction =
  | { type: "LOADED"; visita: VisitaData; datos: Record<string, unknown> }
  | { type: "NOT_FOUND" }
  | { type: "SET_FIELD"; fieldId: string; value: unknown }
  | { type: "SET_DATOS"; datos: Record<string, unknown> }
  | { type: "SET_DATOS_REMOTE"; datos: Record<string, unknown> }
  | { type: "SET_VISITA"; updates: Partial<VisitaData> }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS"; updates?: Partial<VisitaData> }
  | { type: "SAVE_ERROR" }
  | { type: "SYNC_SUCCESS" }
  | { type: "SET_CAMBIANDO_ESTADO"; value: boolean }

export const initialFormState: FormState = {
  visita: null, datos: {}, loading: true, saving: false,
  savedAt: null, pendiente: false, saveError: false, cambiandoEstado: false,
}

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "LOADED":
      return { ...state, visita: action.visita, datos: action.datos, loading: false }
    case "NOT_FOUND":
      return { ...state, loading: false }
    case "SET_FIELD":
      return { ...state, datos: { ...state.datos, [action.fieldId]: action.value }, pendiente: true, savedAt: null }
    case "SET_DATOS":
      return { ...state, datos: action.datos, pendiente: true, savedAt: null }
    case "SET_DATOS_REMOTE":
      return { ...state, datos: action.datos }
    case "SET_VISITA":
      return { ...state, visita: state.visita ? { ...state.visita, ...action.updates } : state.visita }
    case "SAVE_START":
      return { ...state, saving: true, saveError: false }
    case "SAVE_SUCCESS":
      return {
        ...state, saving: false, savedAt: new Date(), pendiente: false,
        visita: state.visita && action.updates ? { ...state.visita, ...action.updates } : state.visita,
      }
    case "SAVE_ERROR":
      return { ...state, saving: false, saveError: true }
    case "SYNC_SUCCESS":
      return { ...state, savedAt: new Date(), pendiente: false }
    case "SET_CAMBIANDO_ESTADO":
      return { ...state, cambiandoEstado: action.value }
    default:
      return state
  }
}
