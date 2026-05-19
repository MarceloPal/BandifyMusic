import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, ShieldCheck, Ticket, Sparkles, HelpCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/helpers'

export default function PlanesPremium() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handlePremiumCheckout = async () => {
    if (!token) return navigate('/auth')
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago')
      if (!data.init_point) throw new Error('Respuesta inválida de MercadoPago')
      window.location.href = data.init_point
    } catch (err) {
      console.error(err)
      alert(err.message || 'No se pudo procesar el pago. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    { name: 'Subida de canciones y maquetas', basico: 'Hasta 3 demos', premium: 'Ilimitado (Archivos de alta calidad)' },
    { name: 'Publicación y venta de entradas', basico: false, premium: true },
    { name: 'Análisis inteligente de sonido', basico: 'Estándar', premium: 'Avanzado (Identifica timbres, ritmo y armonías)' },
    { name: 'Mensajería con otros músicos', basico: '5 conversaciones al mes', premium: 'Ilimitado' },
    { name: 'Visibilidad en las búsquedas', basico: 'Estándar', premium: 'Prioritaria en el Radar de músicos' },
    { name: 'Filtros de búsqueda detallados', basico: 'Básicos', premium: 'Avanzados (Por género exacto y comuna)' },
    { name: 'Guardar favoritos y colaboradores', basico: false, premium: true },
    { name: 'Insignia de perfil verificado', basico: false, premium: true },
  ]

  const renderCell = (value) => {
    if (value === true) return <Check size={20} className="text-purple-400 mx-auto" />
    if (value === false) return <X size={20} className="text-zinc-800 mx-auto" />
    return <span className="text-zinc-400 text-sm">{value}</span>
  }

  return (
    <div className="min-h-screen w-full bg-black text-zinc-100 font-sans antialiased pb-20">
      
      {/* HEADER */}
      <div className="relative overflow-hidden px-6 pt-12 pb-8 max-w-7xl mx-auto bg-black">
        <button 
          onClick={() => navigate(-1)} 
          className="text-zinc-600 hover:text-zinc-400 text-sm mb-6 transition-colors flex items-center gap-2 group"
        >
          <span className="transform group-hover:-translate-x-1 transition-transform">←</span> Volver al panel
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-purple-500 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full">Suscripciones</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-3 tracking-tight">Elige el plan ideal para tu música</h1>
          </div>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl bg-black p-4 rounded-xl border border-zinc-900">
            En Bandify creemos en la autogestión. Las herramientas esenciales de búsqueda siempre serán gratuitas para apoyar a la comunidad independiente, mientras que nuestro plan Premium potencia a quienes están listos para agendar eventos en vivo y expandir su red.
          </p>
        </div>
      </div>

      {/* TARJETAS DE PRECIO (Fondo negro integrado, sin grises) */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 pb-16 bg-black">
        
        {/* Tarjeta Básica */}
        <div className="bg-black rounded-2xl p-8 border border-zinc-900 flex flex-col justify-between relative">
          <div>
            <h3 className="text-xl font-bold text-zinc-400">Plan Comunidad</h3>
            <p className="text-zinc-600 text-sm mt-1">Para músicos que están empezando a armar su red.</p>
            <div className="mt-6 flex items-baseline gap-1 text-white">
              <span className="text-4xl font-extrabold tracking-tight">$0</span>
              <span className="text-zinc-600 text-sm font-medium">/ para siempre</span>
            </div>
            <p className="text-zinc-500 text-xs mt-4 leading-relaxed border-t border-zinc-900 pt-4">
              Crea tu perfil musical, calcula tu afinidad sonora con la comunidad y envía mensajes iniciales para armar tus próximos proyectos.
            </p>
          </div>
          <div className="mt-8">
            <div className="w-full text-center py-3 bg-zinc-950 text-zinc-600 rounded-xl text-sm font-semibold border border-zinc-900">
              Tu plan actual
            </div>
          </div>
        </div>

        {/* Tarjeta Premium */}
        <div className="bg-gradient-to-b from-purple-950/20 to-black rounded-2xl p-8 border-2 border-purple-500 flex flex-col justify-between relative shadow-xl shadow-purple-950/5 pt-12">
          <div className="absolute -top-4 left-6">
            <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black rounded-full tracking-wider shadow-lg shadow-purple-500/20 uppercase">
              <Sparkles size={12} /> recomendado
            </span>
          </div>
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-purple-300">Pro Músico / Organizador</h3>
                <p className="text-zinc-500 text-sm mt-1">Lleva tus proyectos en vivo al siguiente nivel de autogestión.</p>
              </div>
            </div>
            <div className="mt-6 flex items-baseline gap-1 text-white">
              <span className="text-4xl font-extrabold tracking-tight">$2.990</span>
              <span className="text-zinc-500 text-sm font-medium">/ mes</span>
            </div>
            <p className="text-purple-300/40 text-xs mt-4 leading-relaxed border-t border-purple-950/40 pt-4">
              Publica tus propios eventos con mapas, vende entradas directo a tus seguidores sin intermediarios abusivos y destaca en el radar musical.
            </p>
          </div>
          <div className="mt-8">
            <button 
              onClick={handlePremiumCheckout} 
              disabled={isLoading} 
              className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-purple-600/20 hover:scale-[1.01]"
            >
              {isLoading ? 'Conectando de forma segura...' : 'Actualizar a Premium'}
            </button>
          </div>
        </div>

      </div>

      {/* CUADRO COMPARATIVO */}
      <div className="max-w-7xl mx-auto px-6 bg-black">
        <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-black">
          <div className="p-6 bg-black border-b border-zinc-900">
            <h3 className="text-lg font-bold text-white">Comparativa detallada de beneficios</h3>
          </div>

          {/* Mobile responsive */}
          <div className="block lg:hidden divide-y divide-zinc-900">
            {features.map((feature) => (
              <div key={feature.name} className="p-6 space-y-3">
                <span className="text-zinc-200 font-semibold text-sm block">{feature.name}</span>
                <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                  <div className="bg-black p-2.5 rounded-lg border border-zinc-900">
                    <span className="text-zinc-600 block mb-1 font-medium">BÁSICO:</span>
                    <div className="flex items-center justify-start h-6">{renderCell(feature.basico)}</div>
                  </div>
                  <div className="bg-purple-950/5 p-2.5 rounded-lg border border-purple-950/20">
                    <span className="text-purple-400 block mb-1 font-medium">PREMIUM:</span>
                    <div className="flex items-center justify-start h-6">{renderCell(feature.premium)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop version */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-black">
                  <th className="w-2/5 px-8 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Beneficio</th>
                  <th className="w-1/5 px-8 py-5 text-center text-xs font-bold text-zinc-500 uppercase tracking-widest">Básico</th>
                  <th className="w-2/5 px-8 py-5 text-center text-xs font-bold text-purple-500 uppercase tracking-widest bg-black">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {features.map((feature) => (
                  <tr key={feature.name} className="hover:bg-zinc-950/40 transition-colors group">
                    <td className="px-8 py-4.5 text-zinc-400 font-medium text-sm group-hover:text-white transition-colors">{feature.name}</td>
                    <td className="px-8 py-4.5 text-center">{renderCell(feature.basico)}</td>
                    <td className="px-8 py-4.5 text-center bg-purple-950/5 relative border-x border-purple-950/10">
                      {renderCell(feature.premium)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE TOCATAS Y PAGOS */}
      <div className="max-w-7xl mx-auto px-6 mt-16 bg-black">
        <div className="bg-black rounded-2xl p-8 border border-zinc-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-purple-500">
            <Ticket size={180} />
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Potencia tus tocatas y vende tus entradas de forma segura</h2>
              <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">Lanza tus eventos en vivo, mantén el control de tus fechas y conecta directo con tu público.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 border-t border-zinc-900 pt-8">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-purple-400 text-sm font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span> 1. Entradas directo al público
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Publica tus conciertos o tocatas en nuestro mapa georreferenciado para que cualquier músico o asistente cercano pueda descubrirlas. Tus seguidores podrán comprar sus tickets de forma rápida e inmediata utilizando la pasarela segura de <strong>Mercado Pago</strong> con tarjetas de crédito, débito o transferencias bancarias.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-sm font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-green-400"></span> 2. Recibe tus ganancias al instante
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Olvídate de intermediarios que retienen tus fondos por semanas. Cada entrada vendida en tus tocatas se procesa de forma directa y automática, abonando el dinero recaudado de inmediato en tu cuenta de Mercado Pago vinculada para que puedas financiar tus salas de ensayo, traslados o lanzamientos.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span> 3. Control total de tus eventos
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Toma el control absoluto de la taquilla. Desde tu panel podrás gestionar la cantidad de entradas disponibles, fijar el valor de los tickets en pesos chilenos (CLP) y monitorear la asistencia para asegurar una organización impecable el día del evento en vivo.
              </p>
            </div>

          </div>

          <div className="mt-8 bg-black p-4.5 rounded-xl border border-zinc-900 flex items-start gap-3">
            <HelpCircle size={18} className="text-zinc-600 mt-0.5 shrink-0" />
            <p className="text-zinc-500 text-xs leading-relaxed">
              <strong>¿Cómo empezar?</strong> Una vez que te actualices al Plan Premium, podrás habilitar tu módulo de eventos de inmediato. Solo necesitas ingresar los datos de tu tocata, fijar los valores y el sistema se encargará de posicionar tu fecha en el mapa principal de la escena nacional de forma prioritariay destacada.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="max-w-7xl mx-auto mt-12 px-6 bg-black">
        <div className="py-8 px-8 rounded-2xl text-center flex flex-col items-center bg-black border border-zinc-900">
          <h4 className="text-lg font-bold text-white mb-2">¿Tienes alguna duda sobre los beneficios?</h4>
          <p className="text-zinc-400 text-xs sm:text-sm mb-6 max-w-xl">Revisa nuestro centro de soporte técnico para aprender cómo vincular tus credenciales de cobro y sacarle el máximo partido a tu cuenta Premium.</p>
          <button 
            onClick={() => navigate('/help')} 
            className="px-6 py-2 border border-zinc-900 hover:border-purple-500 text-zinc-400 hover:text-purple-400 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200"
          >
            Ir al centro de ayuda →
          </button>
        </div>
      </div>

    </div>
  )
}