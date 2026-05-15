import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
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
    { name: 'Subida de Demos', basico: 'Límite de 3', premium: 'Ilimitado' },
    { name: 'Publicación de Tocatas', basico: false, premium: true },
    { name: 'Análisis Musical', basico: 'Estándar', premium: 'Avanzado multipista' },
    { name: 'Mensajería', basico: 'Límite 5/mes', premium: 'Ilimitado' },
    { name: 'Visibilidad y Búsquedas', basico: 'Estándar', premium: 'Prioritaria y destacada' },
    { name: 'Filtros de Búsqueda', basico: 'Básicos', premium: 'Avanzados por género, comuna' },
    { name: 'Guardar Matches / Favoritos', basico: false, premium: true },
    { name: 'Cuenta Verificada', basico: false, premium: true },
  ]

  const renderCell = (value) => {
    if (value === true) return <Check size={20} className="text-green-400 mx-auto" />
    if (value === false) return <X size={20} className="text-red-400 mx-auto" />
    return <span className="text-zinc-300 text-sm">{value}</span>
  }

  return (
   
    <div className="min-h-screen w-full bg-transparent">
      {/* Header */}
      <div className="relative overflow-hidden px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24">
        <div className="relative z-10 max-w-7xl mx-auto">
          <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-zinc-400 text-sm mb-6 transition-colors flex items-center gap-2">← Atrás</button>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">Planes de Suscripción</h1>
          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-3xl mb-10">
            <span className="text-zinc-300 font-semibold">Modelo Freemium:</span> Bandify adopta un modelo orientado a mantener accesible la funcionalidad principal del sistema de forma gratuita, ofreciendo herramientas avanzadas para músicos y productores con mayores necesidades de visibilidad, almacenamiento y networking profesional.
          </p>
        </div>
      </div>

      {/* Comparativa */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10 sm:py-16">
        {/* Mobile: stacked cards */}
        <div className="lg:hidden space-y-10">
          <div className="p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Básico</h3>
            <div className="space-y-4">
              {features.map((feature) => (
                <div key={feature.name} className="flex items-start justify-between py-4 border-b border-zinc-800/50 last:border-0">
                  <span className="text-zinc-300 font-medium">{feature.name}</span>
                  <div className="ml-6">{renderCell(feature.basico)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative p-8">
            <div className="absolute -top-3 left-6">
              <span className="inline-block px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">★ RECOMENDADO</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-6 mt-4">Premium</h3>
            <div className="space-y-4 mb-8">
              {features.map((feature) => (
                <div key={feature.name} className="flex items-start justify-between py-4 border-b border-zinc-800/50 last:border-0">
                  <span className="text-zinc-300 font-medium">{feature.name}</span>
                  <div className="ml-6">{renderCell(feature.premium)}</div>
                </div>
              ))}
            </div>
            <button onClick={handlePremiumCheckout} disabled={isLoading} className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-70 text-white font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/50">
              {isLoading ? 'Procesando de forma segura...' : 'Actualizar a Premium'}
            </button>
          </div>
        </div>

        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto pb-10">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-zinc-800/50">
                <th className="w-1/2 px-12 py-8 text-left">
                  <span className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Característica</span>
                </th>
                <th className="w-1/4 px-12 py-8 text-center">
                  <span className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Básico</span>
                </th>
                <th className="w-1/4 px-12 py-8 text-center relative">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="inline-block px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full shadow-lg shadow-purple-900/50">★ RECOMENDADO</span>
                  </div>
                  <span className="text-sm font-semibold text-purple-300 uppercase tracking-widest">Premium</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={feature.name} className="border-b border-zinc-800/30 hover:bg-zinc-900/20 transition-colors">
                  <td className="px-12 py-6 text-zinc-300 font-medium">{feature.name}</td>
                  <td className="px-12 py-6 text-center">{renderCell(feature.basico)}</td>
                  {/* Resaltado Premium sutil y orgánico */}
                  <td className="px-12 py-6 text-center bg-gradient-to-b from-purple-500/5 to-transparent relative">
                    <div className="absolute inset-0 border-x border-purple-500/10 pointer-events-none"></div>
                    {renderCell(feature.premium)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-12 py-12 text-right flex justify-end">
            <button onClick={handlePremiumCheckout} disabled={isLoading} className="inline-block w-1/4 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-70 text-white font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20">
              {isLoading ? 'Procesando...' : 'Actualizar a Premium'}
            </button>
          </div>
        </div>
      </div>

      {/* Banner inferior */}
      <div className="max-w-7xl mx-auto mb-16 sm:mb-20 px-6 sm:px-8 lg:px-12">
        <div className="py-10 sm:py-12 px-8 sm:px-10 rounded-2xl text-center flex flex-col items-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(168,85,247,0.02) 100%)', border: '1px solid rgba(168,85,247,0.1)' }}>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">¿Preguntas sobre los planes?</h2>
          <p className="text-zinc-400 text-base sm:text-lg mb-8 max-w-2xl">Contacta con nuestro equipo de soporte para resolver tus dudas sobre Premium y cómo puede potenciar tu carrera musical.</p>
          <button onClick={() => navigate('/help')} className="inline-block px-8 py-3 border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 font-semibold rounded-xl transition-colors">Centro de Ayuda →</button>
        </div>
      </div>
    </div>
  )
}