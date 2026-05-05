import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check, ArrowLeft, Loader2 } from 'lucide-react'
import SoftAurora from '../components/SoftAurora'

function Field({ label, value, onChange, placeholder = '••••••••' }) {
  return (
    <div>
      <label className="block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
      />
    </div>
  )
}

export default function ChangePassword() {
  const navigate = useNavigate()

  const [actual,     setActual]     = useState('')
  const [nueva,      setNueva]      = useState('')
  const [confirmar,  setConfirmar]  = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')

  /* ── Paso 1: validar contraseña actual ── */
  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    if (!actual.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    setIsVerified(true)
  }

  /* ── Paso 2: guardar nueva contraseña ── */
  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (nueva !== confirmar) {
      setError('Las contraseñas no coinciden. Por favor, verifica e inténtalo de nuevo.')
      return
    }
    if (nueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ position: 'relative' }}>

      {/* ── Aurora fondo ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <SoftAurora
          speed={0.4} scale={1.6} brightness={0.9}
          color1="#c4b5fd" color2="#5227FF"
          noiseFrequency={2.2} noiseAmplitude={0.8}
          bandHeight={0.5} bandSpread={1.0}
          octaveDecay={0.15} layerOffset={0.3}
          colorSpeed={0.6} enableMouseInteraction={false}
        />
      </div>

      {/* ── Navbar ── */}
      <nav
        className="flex items-center px-8 py-4 border-b border-white/10"
        style={{ position: 'relative', zIndex: 1, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}
      >
        <Link to="/" className="font-black text-sm tracking-widest text-white">
          BANDIFY
        </Link>
      </nav>

      {/* ── Contenido centrado ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-14" style={{ position: 'relative', zIndex: 1 }}>
        <div className="w-full max-w-sm">
          <div
            className="rounded-2xl p-8 border border-white/10"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}
          >

            {/* ── Estado: éxito ── */}
            {success ? (
              <div className="flex flex-col items-center text-center gap-5">
                <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <Check size={26} className="text-green-400" />
                </div>
                <div>
                  <h1 className="text-white text-xl font-bold mb-2">¡Solicitud exitosa!</h1>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Tu contraseña ha sido actualizada correctamente. Ya puedes usar tu nueva
                    contraseña para acceder desde todos tus dispositivos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Volver a Configuración
                </button>
              </div>

            ) : (
              <>
                {/* ── Header ── */}
                <button
                  type="button"
                  onClick={() => isVerified ? setIsVerified(false) : navigate('/settings')}
                  className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-6 transition-colors"
                >
                  <ArrowLeft size={14} />
                  {isVerified ? 'Atrás' : 'Volver'}
                </button>

                <h1 className="text-white text-xl font-bold mb-1">Cambiar tu contraseña</h1>
                <p className="text-white/40 text-sm mb-7">
                  {isVerified
                    ? 'Elige una contraseña segura que no uses en otros sitios.'
                    : 'Por tu seguridad, ingresa tu contraseña actual para continuar.'}
                </p>

                {/* ── Error ── */}
                {error && (
                  <div className="mb-5 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10">
                    <p className="text-red-300 text-sm leading-relaxed">{error}</p>
                  </div>
                )}

                {/* ── Paso 1: contraseña actual ── */}
                {!isVerified && (
                  <form onSubmit={handleVerify} className="flex flex-col gap-5">
                    <Field label="Contraseña actual" value={actual} onChange={setActual} />
                    <button
                      type="submit"
                      disabled={loading || !actual.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      {loading && <Loader2 size={15} className="animate-spin" />}
                      {loading ? 'Verificando...' : 'Continuar'}
                    </button>
                  </form>
                )}

                {/* ── Paso 2: nueva contraseña ── */}
                {isVerified && (
                  <form onSubmit={handleSave} className="flex flex-col gap-4">
                    <Field label="Nueva contraseña"           value={nueva}     onChange={setNueva}     />
                    <Field label="Confirmar nueva contraseña" value={confirmar} onChange={setConfirmar} />
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      {loading && <Loader2 size={15} className="animate-spin" />}
                      {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </form>
                )}
              </>
            )}

          </div>
        </div>
      </main>

    </div>
  )
}
