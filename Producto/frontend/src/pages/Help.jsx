import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp, Mail } from 'lucide-react'

const FAQS = [
  {
    q: '¿Cómo funciona el análisis de audio?',
    a: 'Sube un archivo .mp3 o .wav desde el Dashboard. Nuestra IA extrae 27 características de tu demo (timbre, ritmo, energía, etc.) y crea un vector de "ADN Musical" único para ti.',
  },
  {
    q: '¿Cómo se calculan los matches?',
    a: 'Comparamos tu vector de ADN Musical con el de los demás usuarios usando similitud coseno. Los músicos con mayor compatibilidad aparecen primero en la página Explorar.',
  },
  {
    q: '¿Puedo subir un nuevo audio para actualizar mi perfil?',
    a: 'Sí. Cada vez que subas un nuevo demo en el Dashboard, el análisis anterior se reemplaza automáticamente. Tu ADN Musical quedará actualizado en segundos.',
  },
  {
    q: '¿Qué formatos de audio acepta Bandify?',
    a: 'Actualmente aceptamos .mp3 y .wav con un tamaño máximo de 20 MB. Recomendamos demos de entre 30 segundos y 3 minutos para un análisis más preciso.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Tus archivos de audio se almacenan en AWS S3 con acceso privado. Solo Bandify puede acceder a ellos para el análisis. Tu información personal nunca se comparte con terceros.',
  },
  {
    q: '¿Cómo puedo contactar a otro músico?',
    a: 'En la página Explorar, haz clic en "Conectar" en la tarjeta de cualquier músico. Esto abrirá un chat directo en la sección Mensajes.',
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
