export const API_URL = import.meta.env.VITE_BACKEND_URL

export function getInitials(nombre) {
  if (!nombre) return '?'
  return nombre.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}
