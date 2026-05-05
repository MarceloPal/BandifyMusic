import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp, Mail } from 'lucide-react'

const FAQS = [
  {
    q: '¿Cómo funciona el análisis?',
    a: 'Solo sube tu demo en .mp3 o .wav. Nuestra inteligencia artificial escuchará tu música y creará un "ADN Musical" único basado en tu ritmo, energía y estilo sonoro.',
  },
  {
    q: '¿Cómo encuentro músicos similares?',
    a: 'Comparamos tu ADN con el de otros artistas. Los que mejor encajen con tu sonido aparecerán primero en tu lista de recomendaciones.',
  },
  {
    q: '¿Cómo actualizo mi sonido?',
    a: 'Simplemente sube una nueva canción. Tu ADN se actualizará automáticamente para reflejar tu estilo actual.',
  },
  {
    q: '¿Qué archivos puedo subir?',
    a: 'Aceptamos archivos .mp3 y .wav de hasta 20 MB. Te recomendamos subir canciones de entre 30 segundos y 3 minutos para obtener mejores resultados.',
  },
  {
    q: '¿Mi música está protegida?',
    a: 'Sí. Tus canciones se guardan de forma privada en servidores seguros de Amazon (AWS). Solo se usan para el análisis de tu perfil y nadie más podrá descargarlas sin tu permiso.',
  },
  {
    q: '¿Cómo hablo con alguien?',
    a: 'En la sección Explorar, dale a "Conectar" y se abrirá un chat directo para que empiecen a colaborar.',
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/8 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-zinc-100 text-sm font-medium">{q}</span>
        {open
          ? <ChevronUp size={15} className="text-zinc-500 flex-shrink-0" />
          : <ChevronDown size={15} className="text-zinc-500 flex-shrink-0" />
        }
      </button>
      {open && (
        <p className="text-zinc-400 text-sm pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function Help() {
  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <HelpCircle size={24} />
          Ayuda
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Respuestas a las preguntas más frecuentes sobre Bandify.
        </p>
      </div>

      {/* FAQ */}
      <div className="bg-zinc-800 rounded-2xl px-6 py-2 mb-4 border border-white/8 shadow-sm">
        {FAQS.map((item) => (
          <FAQItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>

      {/* Contacto */}
      <div className="bg-zinc-800 rounded-2xl p-6 flex items-start gap-4 border border-white/8 shadow-sm">
        <Mail size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-zinc-100 text-sm font-semibold mb-1">¿No encontraste tu respuesta?</p>
          <p className="text-zinc-400 text-sm mb-3">Escríbenos y te respondemos a la brevedad.</p>
          <a
            href="mailto:soporte@bandify.cl"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full text-xs font-semibold hover:bg-purple-500 transition-colors"
          >
            <Mail size={12} />
            soporte@bandify.cl
          </a>
        </div>
      </div>
    </div>
  )
}
