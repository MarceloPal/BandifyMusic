/**
 * PremiumModal — Se muestra cuando un usuario gratuito intenta
 * superar el límite de 3 demos activos.
 */

// `Infinity` se renombra a `InfinityIcon` para no pisar el global Infinity de JS.
import { useNavigate } from 'react-router-dom'
import { Sparkles, X, Zap, Infinity as InfinityIcon, Star } from 'lucide-react'

// Usamos `Icon` capitalizado directamente como key del objeto:
// así el destructure `{ Icon, text }` no requiere alias y el linter detecta
// el uso en JSX (`<Icon ...>`) sin marcar falsos positivos de "unused var".
const BENEFITS = [
  { Icon: InfinityIcon, text: 'Demos ilimitados en tu repertorio' },
  { Icon: Zap,          text: 'Análisis de audio prioritario' },
  { Icon: Star,         text: 'Destacado en resultados de Explorar' },
]

export default function PremiumModal({ onClose }) {
  const navigate = useNavigate()

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Card */}
        <div
          className="bg-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <X size={16} />
          </button>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center mx-auto mb-5">
            <Sparkles size={28} className="text-white" />
          </div>

          {/* Text */}
          <h2 className="text-zinc-100 font-bold text-xl text-center mb-2">
            Límite de demos alcanzado
          </h2>
          <p className="text-zinc-400 text-sm text-center leading-relaxed mb-6">
            Las cuentas gratuitas pueden tener hasta <strong>3 demos activos</strong>.
            Actualiza a Bandify Premium para acceso ilimitado.
          </p>

          {/* Benefits */}
          <div className="flex flex-col gap-3 mb-7">
            {BENEFITS.map(({ text, Icon }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-purple-600" />
                </div>
                <p className="text-zinc-200 text-sm">{text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-3.5 rounded-full text-sm hover:bg-purple-500 transition-colors shadow-md"
            onClick={() => {
              onClose()
              navigate('/planes')
            }}
          >
            ¡Quiero ser Premium! ✨
          </button>
          <button
            onClick={onClose}
            className="w-full mt-2 text-zinc-500 text-xs py-2 hover:text-zinc-200 transition-colors"
          >
            Continuar con cuenta gratuita
          </button>
        </div>
      </div>
    </>
  )
}
