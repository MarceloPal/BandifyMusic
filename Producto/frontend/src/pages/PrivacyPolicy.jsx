import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SECTIONS = [
  {
    title: '1. ¿Quiénes somos?',
    content: `Bandify es una plataforma de colaboración musical para artistas independientes en Chile. Nuestro servicio incluye un sistema de Inteligencia Artificial que analiza archivos de audio y genera un perfil sonoro ("ADN Musical") para conectar músicos con estilos compatibles.

Puedes contactarnos en soporte@bandify.cl ante cualquier consulta relacionada con tus datos personales.`,
  },
  {
    title: '2. ¿Qué datos recopilamos?',
    subsections: [
      {
        subtitle: 'Datos que tú nos proporcionas',
        items: [
          'Nombre o nombre artístico, correo electrónico y contraseña (almacenada de forma cifrada).',
          'Información de perfil: ciudad, instrumento, estilos musicales, foto de perfil y banner.',
          'Redes sociales (Instagram, Spotify, Discord) si decides ingresarlas.',
          'Archivos de audio (.mp3 o .wav) que subas para el análisis.',
          'Mensajes enviados a otros usuarios dentro de la plataforma.',
          'Información de eventos (Tocatas) y tickets digitales que publiques o adquieras.',
        ],
      },
      {
        subtitle: 'Datos que recopilamos automáticamente',
        items: [
          'Datos técnicos de sesión: token de autenticación JWT almacenado en tu navegador.',
          'Preferencias de visualización guardadas localmente (por ejemplo, la vista de tu ADN Musical).',
        ],
      },
    ],
  },
  {
    title: '3. ¿Para qué usamos tus datos?',
    items: [
      'Crear y gestionar tu cuenta de usuario y nivel de suscripción (Freemium o Premium).',
      'Analizar tus archivos de audio con nuestra IA para generar tu ADN Musical.',
      'Calcular compatibilidad sonora y mostrarte músicos afines en la sección Explorar.',
      'Permitirte comunicarte con otros músicos a través del chat de Mensajes.',
      'Mostrarte y permitirte gestionar eventos musicales y tickets en la sección Tocatas.',
      'Enviarte correos transaccionales (confirmación de registro, restablecimiento de contraseña).',
      'Mejorar la plataforma durante su fase de desarrollo académico.',
    ],
  },
  {
    title: '4. Tus archivos de audio y tu propiedad intelectual',
    content: `Conservas el 100% de los derechos de autor sobre toda la música que subes a Bandify. Al subir un archivo, nos otorgas únicamente una licencia técnica, limitada y revocable, para almacenarlo en servidores seguros de Amazon Web Services (AWS S3), procesarlo con nuestra IA y generar tu ADN Musical.

Bandify no distribuirá, venderá ni utilizará tu música con fines comerciales propios. Puedes eliminar cualquier archivo desde tu perfil en cualquier momento.`,
  },
  {
    title: '5. ¿Con quién compartimos tus datos?',
    content: 'Bandify no vende ni comercializa tus datos personales a terceros. Solo los compartimos en las siguientes situaciones:',
    items: [
      'Amazon Web Services (AWS): para el almacenamiento seguro de archivos de audio e imágenes.',
      'Resend: para el envío de correos electrónicos transaccionales.',
      'Mercado Pago (Checkout Pro): para el procesamiento seguro de transacciones, suscripciones y venta de entradas. Bandify delega toda la gestión financiera y NO almacena información de tarjetas de crédito o cuentas bancarias en sus servidores.',
      'Requerimiento legal: si una autoridad competente lo exige conforme a la ley chilena.',
    ],
  },
  {
    title: '6. ¿Cuánto tiempo guardamos tus datos?',
    content: 'Conservamos tus datos mientras tu cuenta esté activa. Si eliminas tu cuenta desde Ajustes → Seguridad → Zona de peligro, todos tus datos (perfil, archivos de audio, ADN Musical y mensajes) serán eliminados de forma permanente e irreversible de nuestros sistemas.',
  },
  {
    title: '7. Seguridad de tus datos',
    content: 'Tomamos medidas razonables para proteger tu información:',
    items: [
      'Las contraseñas se almacenan cifradas con bcrypt y nunca en texto plano.',
      'La comunicación entre tu navegador y nuestros servidores utiliza HTTPS.',
      'Los archivos de audio se almacenan en AWS S3 con acceso restringido mediante URLs temporales (presigned URLs).',
      'El acceso a la API requiere autenticación mediante tokens JWT.',
    ],
    footer: 'Sin embargo, ningún sistema es 100% infalible. Como plataforma en fase Beta, pueden existir vulnerabilidades. Te notificaremos en caso de una brecha de seguridad que afecte tus datos.',
  },
  {
    title: '8. Tus derechos',
    content: 'De acuerdo con la legislación chilena (Ley N° 19.628 sobre Protección de la Vida Privada), tienes derecho a:',
    items: [
      'Acceder a los datos personales que tenemos sobre ti.',
      'Rectificar información incorrecta desde la sección de Ajustes.',
      'Eliminar tu cuenta y todos tus datos de forma permanente.',
      'Oponerte al uso de tus datos para fines distintos a los descritos aquí.',
    ],
    footer: 'Para ejercer cualquiera de estos derechos, escríbenos a soporte@bandify.cl.',
  },
  {
    title: '9. Cookies y almacenamiento local',
    content: 'Bandify no utiliza cookies de seguimiento ni publicidad. Usamos el almacenamiento local del navegador (localStorage) únicamente para guardar preferencias de la interfaz, como la vista seleccionada en tu ADN Musical. Estos datos nunca se envían a nuestros servidores.',
  },
  {
    title: '10. Plataforma en fase Beta',
    content: 'Bandify es actualmente un proyecto académico en desarrollo activo operando en modalidades de prueba (incluyendo pasarelas Sandbox). Esto significa que el servicio puede experimentar interrupciones, pérdidas de datos o cambios en su funcionamiento sin previo aviso. Te recomendamos mantener copias de tus archivos de audio fuera de la plataforma.',
  },
  {
    title: '11. Cambios en esta política',
    content: 'Podemos actualizar esta Política de Privacidad cuando sea necesario. Si realizamos cambios relevantes, te lo comunicaremos a través de la plataforma. La fecha de la última actualización siempre estará visible al inicio del documento.',
  },
  {
    title: '12. Legislación aplicable',
    content: 'Esta política se rige por las leyes de la República de Chile. Cualquier disputa se someterá a los tribunales competentes de la ciudad de Santiago de Chile.',
  },
]

function Section({ section }) {
  return (
    <div className="border-b border-white/8 last:border-0 py-7">
      <h2 className="text-white text-base font-semibold mb-3">{section.title}</h2>

      {section.content && (
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line mb-3">
          {section.content}
        </p>
      )}

      {section.subsections?.map((sub) => (
        <div key={sub.subtitle} className="mb-4">
          <p className="text-zinc-200 text-sm font-medium mb-2">{sub.subtitle}</p>
          <ul className="flex flex-col gap-1.5 pl-4">
            {sub.items.map((item, i) => (
              <li key={i} className="text-zinc-300 text-sm leading-relaxed list-disc list-outside">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {section.items && !section.subsections && (
        <ul className="flex flex-col gap-1.5 pl-4">
          {section.items.map((item, i) => (
            <li key={i} className="text-zinc-300 text-sm leading-relaxed list-disc list-outside">
              {item}
            </li>
          ))}
        </ul>
      )}

      {section.footer && (
        <p className="text-zinc-300 text-sm leading-relaxed mt-3">{section.footer}</p>
      )}
    </div>
  )
}

export default function PrivacyPolicy() {
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
          <h1 className="text-2xl font-bold text-white mb-2">Política de Privacidad</h1>
          <p className="text-zinc-500 text-sm mb-4">Última actualización: mayo de 2026</p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            En Bandify nos importa tu privacidad. Esta política explica de forma clara qué datos
            recopilamos, cómo los usamos y cuáles son tus derechos como usuario.
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
          <p className="text-white text-sm font-semibold mb-1">¿Tienes dudas sobre tu privacidad?</p>
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