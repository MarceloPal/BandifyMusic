/**
 * Hook para obtener una URL firmada de imagen desde AWS S3.
 * Cachea el resultado 50 minutos (la URL expira en 60 min).
 *
 * @param {string|null} key — Clave S3 (ej. "avatars/user-xxx.jpg")
 * @returns {{ url: string|null, isLoading: boolean }}
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth }  from '../context/AuthContext'
import { API_URL }  from '../utils/helpers'

export function useImageUrl(key) {
  const { token } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['image-url', key],
    queryFn: async () => {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(
        `${API_URL}/images/view-url?key=${encodeURIComponent(key)}`,
        { headers }
      )
      if (!res.ok) return null
      const json = await res.json()
      return json.url ?? null
    },
    enabled:   !!key,
    staleTime: 50 * 60 * 1000,  // 50 min
    gcTime:    60 * 60 * 1000,  // 1 hora
  })

  return { url: data ?? null, isLoading }
}
