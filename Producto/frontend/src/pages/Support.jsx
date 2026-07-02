import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/helpers'

export default function Support() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [formData, setFormData] = useState({
    email: user?.email || '',
    asunto: '',
    mensaje: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!formData.email?.trim()) {
      setError('El email es obligatorio')
      return
    }
    if (!formData.asunto?.trim()) {
      setError('El asunto es obligatorio')
      return
    }
    if (!formData.mensaje?.trim()) {
      setError('El mensaje es obligatorio')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/soporte`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al enviar el formulario')
      }

      setSubmitted(true)
      setFormData({ email: user?.email || '', asunto: '', mensaje: '' })
    } catch (err) {
      setError(err.message || 'Error al enviar el formulario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col pt-20 pb-20">
      <div className="max-w-2xl mx-auto px-6 w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Volver
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Soporte al Cliente
          </h1>
          <p className="text-zinc-400 text-lg max-w-md mx-auto">
            ¿Tienes una pregunta o problema? Estamos aquí para ayudarte. Nuestro equipo te contactará lo antes posible.
          </p>
        </div>

        {/* Success State */}
        {submitted && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 md:p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center mb-4">
              <CheckCircle size={48} className="text-green-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              ¡Solicitud Exitosa!
            </h2>
            <p className="text-zinc-300 text-lg mb-6 max-w-md mx-auto">
              Nuestro equipo te contactará pronto. Revisaremos tu mensaje con atención.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
            >
              Enviar otro mensaje
            </button>
          </div>
        )}

        {/* Form */}
        {!submitted && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                  required
                />
                <p className="text-zinc-500 text-xs mt-1">
                  Usaremos este correo para contactarte
                </p>
              </div>

              {/* Asunto */}
              <div>
                <label htmlFor="asunto" className="block text-sm font-semibold text-white mb-2">
                  Asunto
                </label>
                <input
                  type="text"
                  id="asunto"
                  name="asunto"
                  value={formData.asunto}
                  onChange={handleChange}
                  placeholder="Describe brevemente tu consulta"
                  maxLength={255}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                  required
                />
                <p className="text-zinc-500 text-xs mt-1">
                  Máximo 255 caracteres
                </p>
              </div>

              {/* Mensaje */}
              <div>
                <label htmlFor="mensaje" className="block text-sm font-semibold text-white mb-2">
                  Mensaje
                </label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  value={formData.mensaje}
                  onChange={handleChange}
                  placeholder="Cuéntanos más detalles sobre tu consulta..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                  required
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Mensaje'
                )}
              </button>
            </form>

            {/* Info */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-zinc-400 text-sm text-center">
                Nos comprometemos a responder en las próximas 24-48 horas.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
