import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SECTIONS = [
  {
    title: '1. Aceptación y naturaleza del servicio',
    paragraphs: [
      'Al crear una cuenta o usar cualquier función de Bandify, aceptas estos Términos y Condiciones en su totalidad. Si no estás de acuerdo, no uses el servicio.',
      'Bandify es un proyecto académico de título en fase Beta. El servicio se ofrece en su estado actual (as-is), sin garantías de disponibilidad continua ni de ausencia de errores. Podemos modificar, suspender o discontinuar funcionalidades en cualquier momento y sin previo aviso, ya sea por razones técnicas, académicas o de desarrollo.',
      'Nos reservamos el derecho de actualizar estos términos. Si realizamos cambios relevantes, lo comunicaremos dentro de la plataforma. Seguir usando Bandify tras una actualización implica la aceptación de los nuevos términos.',
    ],
  },
  {
    title: '2. Cuentas de usuario y niveles de suscripción',
    intro: 'Para usar Bandify debes cumplir con las siguientes normas de acceso:',
    items: [
      'Ser mayor de 18 años, o contar con la autorización expresa de un tutor legal si eres menor de edad.',
      'Proporcionar información veraz: nombre o nombre artístico real, correo electrónico válido y datos de perfil honestos.',
      'Mantener tu contraseña segura: eres el único responsable de la confidencialidad de tu cuenta. No la compartas con terceros.',
      'Plan Freemium (Gratuito): Permite almacenar un máximo de 3 maquetas de audio activas en el sistema, con un peso límite estricto de 60 MB por archivo.',
      'Plan Premium (Suscripción): Desbloquea cuotas avanzadas de almacenamiento ilimitado de pistas en la nube y eleva la capacidad de carga por archivo hasta un máximo de 100 MB.',
    ],
    footer: 'Si sospechas que tu cuenta fue comprometida, notifícanos de inmediato a soporte@bandify.cl. Bandify no se hace responsable por daños derivados del acceso no autorizado causado por negligencia del propio usuario.',
  },
  {
    title: '3. Propiedad intelectual y derechos de autor',
    subsections: [
      {
        subtitle: '3.1 Tu música es tuya',
        paragraphs: [
          'Al subir un archivo de audio a Bandify, conservas el 100% de los derechos de autor sobre tu obra. Nada en estos términos transfiere la propiedad de tu música a Bandify ni a ningún tercero.',
        ],
      },
      {
        subtitle: '3.2 Licencia técnica limitada',
        intro: 'Para poder ofrecerte el servicio, al subir un demo nos otorgas una licencia no exclusiva, gratuita, temporal y revocable para:',
        items: [
          'Almacenar el archivo en servidores seguros de Amazon Web Services (AWS S3).',
          'Procesarlo internamente con nuestra Inteligencia Artificial para extraer características sonoras y generar tu "ADN Musical".',
          'Usar ese análisis exclusivamente dentro de Bandify para el sistema de matching entre músicos.',
        ],
        footer: 'Esta licencia no autoriza a Bandify a distribuir, vender, reproducir públicamente ni explotar comercialmente tu música. Puedes revocarla en cualquier momento eliminando el archivo desde tu perfil.',
      },
      {
        subtitle: '3.3 Prohibición de material ajeno',
        intro: 'Queda estrictamente prohibido subir cualquier archivo de audio que no sea de tu autoría o sobre el cual no tengas los derechos necesarios. Esto incluye:',
        items: [
          'Canciones de otros artistas sin autorización expresa.',
          'Covers de obras protegidas sin la licencia correspondiente.',
          'Pistas obtenidas de fuentes no autorizadas.',
        ],
        footer: 'El incumplimiento resultará en la suspensión inmediata de la cuenta y la eliminación del material. El usuario infractor asume íntegramente la responsabilidad civil y penal que derive de esa infracción.',
      },
    ],
  },
  {
    title: '4. Normas de la comunidad',
    intro: 'Bandify es un espacio de colaboración entre músicos. Las siguientes conductas están prohibidas y pueden derivar en la suspensión de la cuenta:',
    subsections: [
      {
        subtitle: 'En Mensajes (chat directo):',
        items: [
          'Enviar spam o mensajes repetitivos con fines comerciales no solicitados.',
          'Acosar, insultar, amenazar o discriminar a otros usuarios.',
          'Compartir enlaces maliciosos, contenido ilegal o material inapropiado.',
        ],
      },
      {
        subtitle: 'En Tocatas (eventos):',
        items: [
          'Publicar eventos falsos, con información engañosa o con el único fin de atraer tráfico.',
          'Usar la sección de eventos para fines distintos a la difusión de actividades musicales reales.',
        ],
      },
    ],
    footer: 'Bandify puede eliminar contenido que infrinja estas normas sin previo aviso.',
  },
  {
    title: '5. Pagos, Monetización y Entorno Sandbox',
    intro: 'La plataforma implementa flujos transaccionales mediante un modelo híbrido para suscripciones Premium y venta de entradas en el mapa de Tocatas:',
    items: [
      'Procesamiento Tercerizado: Todas las transacciones financieras son procesadas a través del SDK oficial de Checkout Pro de Mercado Pago. Bandify no almacena, procesa ni posee acceso a datos bancarios, números de tarjetas de crédito o credenciales de pago.',
      'Tasa de Servicio Técnica (Marketplace Fee): La plataforma aplica una retención automatizada del 5% sobre el valor neto de cada ticket digital transaccionado en la sección de Tocatas, destinada exclusivamente al financiamiento de los costos de servidores Cloud.',
      'Fase de Pruebas Académicas: En cumplimiento con el alcance del hito evaluativo actual, la pasarela de pago opera estrictamente bajo el entorno seguro "Sandbox" de Mercado Pago, utilizando credenciales de prueba y dinero simulado. No se ejecutan cobros bancarios reales ni flujos tributarios comerciales en esta versión.',
    ],
    footer: 'La responsabilidad última sobre la correcta ejecución de los eventos presenciales recae en el músico u organizador que publica la tocata, actuando Bandify únicamente como intermediario tecnológico.',
  },
  {
    title: '6. Limitación de responsabilidad',
    intro: 'Al ser un proyecto académico en fase Beta, Bandify no se hace responsable por:',
    items: [
      'Pérdida de archivos de audio: el usuario es responsable de mantener respaldos propios de su música. No garantizamos la preservación permanente de los archivos almacenados.',
      'Interrupciones del servicio: caídas del servidor, errores de la IA o pérdida de datos derivados del estado de desarrollo de la plataforma.',
      'Conflictos entre usuarios: Bandify actúa como intermediario técnico. No somos responsables por disputas o situaciones que ocurran entre músicos derivadas del uso del chat o la asistencia a Tocatas.',
      'Resultados del matching: el ADN Musical es una herramienta de sugerencia. No garantizamos compatibilidad artística ni el éxito de las colaboraciones que se formen a través de la plataforma.',
    ],
  },
  {
    title: '7. Suspensión y eliminación de cuentas',
    subsections: [
      {
        subtitle: '7.1 Suspensión por parte de Bandify',
        intro: 'Nos reservamos el derecho de suspender o eliminar cuentas, de forma temporal o permanente, ante:',
        items: [
          'Infracción de derechos de autor de terceros.',
          'Conducta abusiva, spam o acoso a otros usuarios.',
          'Publicación de eventos falsos o uso fraudulento de la plataforma.',
          'Cualquier actividad que ponga en riesgo la seguridad del sistema o de otros usuarios.',
        ],
        footer: 'En casos graves, la suspensión puede ser inmediata y sin notificación previa.',
      },
      {
        subtitle: '7.2 Eliminación por parte del usuario',
        paragraphs: [
          'Puedes eliminar tu cuenta en cualquier momento desde Ajustes → Seguridad → Zona de peligro. Al confirmar, tu perfil, archivos de audio, ADN Musical y mensajes serán eliminados de forma permanente e irreversible. Esta acción no puede deshacerse.',
        ],
      },
    ],
  },
  {
    title: '8. Legislación y jurisdicción',
    paragraphs: [
      'Estos Términos y Condiciones se rigen por las leyes de la República de Chile. Cualquier controversia derivada del uso de Bandify se someterá a la competencia de los tribunales ordinarios de justicia de la ciudad de Santiago de Chile.',
    ],
  },
  {
    title: '9. Contacto',
    paragraphs: [
      'Para consultas, reclamos o reportes relacionados con estos términos, escríbenos a soporte@bandify.cl.',
    ],
  },
]

function Subsection({ sub }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="text-zinc-200 text-sm font-semibold mb-2">{sub.subtitle}</p>
      {sub.paragraphs?.map((p, i) => (
        <p key={i} className="text-zinc-300 text-sm leading-relaxed mb-2">{p}</p>
      ))}
      {sub.intro && (
        <p className="text-zinc-300 text-sm leading-relaxed mb-2">{sub.intro}</p>
      )}
      {sub.items && (
        <ul className="flex flex-col gap-1.5 pl-4 mb-2">
          {sub.items.map((item, i) => (
            <li key={i} className="text-zinc-300 text-sm leading-relaxed list-disc list-outside">
              {item}
            </li>
          ))}
        </ul>
      )}
      {sub.footer && (
        <p className="text-zinc-300 text-sm leading-relaxed">{sub.footer}</p>
      )}
    </div>
  )
}

function Section({ section }) {
  return (
    <div className="border-b border-white/8 last:border-0 py-7">
      <h2 className="text-white text-base font-semibold mb-3">{section.title}</h2>

      {section.paragraphs?.map((p, i) => (
        <p key={i} className="text-zinc-300 text-sm leading-relaxed mb-2">{p}</p>
      ))}

      {section.intro && (
        <p className="text-zinc-300 text-sm leading-relaxed mb-2">{section.intro}</p>
      )}

      {section.items && !section.subsections && (
        <ul className="flex flex-col gap-1.5 pl-4 mb-2">
          {section.items.map((item, i) => (
            <li key={i} className="text-zinc-300 text-sm leading-relaxed list-disc list-outside">
              {item}
            </li>
          ))}
        </ul>
      )}

      {section.subsections?.map((sub) => (
        <Subsection key={sub.subtitle} sub={sub} />
      ))}

      {section.footer && (
        <p className="text-zinc-300 text-sm leading-relaxed mt-3">{section.footer}</p>
      )}
    </div>
  )
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-12 w-full">

        {/* Volver */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-200 text-sm mb-10 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver al inicio
        </Link>

        {/* Header */}
        <div className="mb-10 pb-8 border-b border-white/8">
          <h1 className="text-2xl font-bold text-white mb-2">Términos y Condiciones de Uso</h1>
          <p className="text-zinc-500 text-sm mb-4">Última actualización: mayo de 2026 · Versión Beta 1.0</p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Estos términos regulan el uso de Bandify, una plataforma de colaboración musical
            para artistas independientes en Chile. Léelos con atención antes de crear tu cuenta.
          </p>
        </div>

        {/* Secciones */}
        <div className="mb-12">
          {SECTIONS.map((section) => (
            <Section key={section.title} section={section} />
          ))}
        </div>

        {/* Contacto */}
        <div className="border-t border-white/8 pt-8">
          <p className="text-white text-sm font-semibold mb-1">¿Tienes dudas sobre estos términos?</p>
          <p className="text-zinc-300 text-sm mb-4">Escríbenos y te respondemos a la brevedad.</p>
          <a
            href="mailto:soporte@bandify.cl"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full text-xs font-semibold hover:bg-purple-500 transition-colors"
          >
            soporte@bandify.cl
          </a>
        </div>

      </div>
    </div>
  )
}