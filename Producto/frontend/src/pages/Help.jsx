import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, ChevronDown, ChevronUp, Mail } from 'lucide-react'

const FAQS = [
  // Análisis y Perfil
  {
    q: '¿Cómo funciona el análisis de Inteligencia Artificial?',
    a: 'Solo sube tu demo en .mp3 o .wav. Nuestra IA extraerá 27 dimensiones de tu audio y creará un "ADN Musical" único basado en tu ritmo, energía y estilo sonoro.',
  },
  {
    q: '¿Qué archivos puedo subir si tengo cuenta gratuita?',
    a: 'En el plan Freemium aceptamos archivos .mp3 y .wav de hasta 60 MB, con un límite de 3 demos activos en tu perfil. Te recomendamos subir canciones de entre 30 segundos y 3 minutos para obtener mejores resultados.',
  },
  {
    q: '¿Cómo encuentro músicos similares a mí?',
    a: 'Comparamos matemáticamente tu ADN con el de otros artistas. Los que tengan mayor porcentaje de afinidad contigo aparecerán primero en tu lista de recomendaciones en la sección Explorar.',
  },
  // Suscripciones y Pagos
  {
    q: '¿Qué beneficios tiene la suscripción Premium?',
    a: 'Por $2.990 CLP al mes, liberas el límite de almacenamiento para subir demos ilimitados a nuestros servidores, aumentas el límite de carga a 100 MB por archivo y obtienes visibilidad prioritaria en las búsquedas de otros músicos.',
  },
  {
    q: '¿Es seguro ingresar mis datos de pago?',
    a: 'Totalmente. Utilizamos la plataforma segura de Mercado Pago (Checkout Pro) para procesar todas las transacciones. Nosotros no almacenamos ni tenemos acceso a la información sensible de tu tarjeta o cuenta bancaria.',
  },
  // Tocatas y Eventos
  {
    q: '¿Cómo publico una tocata en el mapa?',
    a: 'Ve a la sección "Tocatas" y selecciona "Agregar Evento". Podrás fijar las coordenadas exactas en el mapa interactivo, definir el precio del ticket y subir el flyer del evento para que la comunidad asista.',
  },
  {
    q: '¿Cómo funciona la venta de tickets para mi tocata?',
    a: 'Cuando un usuario compra una entrada para tu evento a través de la plataforma, el dinero se transfiere directamente. Bandify solo retiene una comisión técnica del 5% por transacción para mantener los servidores funcionando.',
  },
  // Privacidad y Contacto
  {
    q: '¿Mi música está protegida contra descargas?',
    a: 'Sí. Tus canciones se guardan de forma privada en servidores seguros de Amazon (AWS S3). Solo se usan para el motor de matching y nadie más podrá descargarlas sin tu permiso.',
  },
  {
    q: '¿Cómo hablo con alguien para colaborar?',
    a: 'En la sección Explorar, dale a "Conectar" y se abrirá nuestro chat interno directo para que empiecen a conversar al instante.',
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/8 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 transition-colors hover:text-purple-400"
      >
        <span className="text-zinc-100 text-sm font-medium">{q}</span>
        {open ? (
          <ChevronUp size={15} className="text-purple-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-zinc-500 flex-shrink-0" />
        )}
      </button>
      {open && (
        <p className="text-zinc-400 text-sm pb-4 leading-relaxed pr-6">{a}</p>
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
        <Mail size={18} className="text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-zinc-100 text-sm font-semibold mb-1">
            ¿No encontraste tu respuesta?
          </p>
          <p className="text-zinc-400 text-sm mb-4">
            Escríbenos y te respondemos a la brevedad.
          </p>
          <Link
            to="/soporte"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-full text-sm font-semibold hover:from-purple-500 hover:to-purple-400 transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
          >
            <Mail size={16} />
            Ir al Centro de Soporte
          </Link>
        </div>
      </div>
    </div>
  )
}