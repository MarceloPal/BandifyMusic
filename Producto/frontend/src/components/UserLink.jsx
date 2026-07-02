import { useNavigate } from 'react-router-dom'

/**
 * Enlace al perfil público /u/:username.
 * Usa <span> + useNavigate para que funcione dentro de <button>
 * sin violar la especificación HTML (no anidar <a> en <button>).
 * stopPropagation evita que el onClick del padre interfiera.
 */
export default function UserLink({ username, children, className = '' }) {
  const navigate = useNavigate()

  if (!username) return <span className={className}>{children}</span>

  return (
    <span
      role="link"
      tabIndex={0}
      className={`hover:text-purple-400 transition-colors cursor-pointer ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        navigate(`/u/${username}`)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation()
          navigate(`/u/${username}`)
        }
      }}
    >
      {children}
    </span>
  )
}
