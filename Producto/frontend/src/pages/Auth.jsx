import { useState } from 'react'
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/helpers'
import SoftAurora from '../components/SoftAurora'

/**
 * Vistas posibles:
 *   login    — iniciar sesión
 *   register — crear cuenta
 *   forgot   — solicitar reset de contraseña (input de email)
 *   sent     — confirmación de envío del email de reset
 *   reset    — nueva contraseña (token en URL)
 */

export default function Auth() {
  const [searchParams] = useSearchParams()
  const initialView = searchParams.get('mode') === 'reset'
    ? 'reset'
    : searchParams.get('mode') === 'login'
    ? 'login'
    : 'register'

  const [view, setView]               = useState(initialView)
  const [error, setError]             = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm]   = useState('')
  const navigate                      = useNavigate()
  const { token, user, login }        = useAuth()

  const passwordMismatch = regPassword && regConfirm && regPassword !== regConfirm
  const regFormInvalid   = !regPassword || !regConfirm || !!passwordMismatch

  // ── Mutación login / registro ─────────────────────────────────────────────
  const authMutation = useMutation({
    mutationFn: async (formData) => {
      const isLogin  = view === 'login'
      const endpoint = isLogin ? '/auth/login' : '/auth/registro'
      const body = isLogin
        ? { identifier: formData.identifier, password: formData.password }
        : { nombre: formData.username, fecha_nacimiento: formData.fecha_nacimiento || null, email: formData.email, password: formData.password }

      const res  = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return { ...data, isLogin }
    },
    onSuccess: ({ isLogin: wasLogin, ...data }) => {
      login(data.token, data.usuario)
      if (data.usuario?.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        if (!wasLogin) toast.success('¡Cuenta creada exitosamente!')
        navigate(wasLogin ? '/mi-adn' : '/onboarding')
      }
    },
    onError: (err) => {
      setError(err.message)
      if (view === 'login') toast.error('Credenciales incorrectas o error de conexión.')
    },
  })

  // ── Mutación forgot password ──────────────────────────────────────────────
  const forgotMutation = useMutation({
    mutationFn: async ({ email }) => {
      const res  = await fetch(`${API_URL}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => setView('sent'),
    onError:   (err) => setError(err.message),
  })

  // ── Mutación reset password ───────────────────────────────────────────────
  const resetMutation = useMutation({
    mutationFn: async ({ password }) => {
      const resetToken = searchParams.get('token')
      const res  = await fetch(`${API_URL}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: resetToken, password }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      setView('login')
      setError('')
      navigate('/auth?mode=login', { replace: true })
    },
    onError: (err) => setError(err.message),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const fd = Object.fromEntries(new FormData(e.target))

    if (view === 'login') {
      authMutation.mutate(fd)
    } else if (view === 'register') {
      if (regPassword !== regConfirm) {
        setError('Las contraseñas no coinciden.')
        return
      }
      authMutation.mutate({ ...fd, password: regPassword })
    } else if (view === 'forgot') {
      forgotMutation.mutate(fd)
    } else if (view === 'reset') {
      resetMutation.mutate(fd)
    }
  }

  const switchTo = (v) => {
    setView(v)
    setError('')
    setRegPassword('')
    setRegConfirm('')
    authMutation.reset()
    forgotMutation.reset()
    resetMutation.reset()
  }

  if (token && !authMutation.isSuccess) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/mi-adn'} replace />
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ position: 'relative' }}>

      {/* Aurora */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <SoftAurora speed={0.4} scale={1.6} brightness={0.9} color1="#c4b5fd" color2="#5227FF"
          noiseFrequency={2.2} noiseAmplitude={0.8} bandHeight={0.5} bandSpread={1.0}
          octaveDecay={0.15} layerOffset={0.3} colorSpeed={0.6} enableMouseInteraction={false} />
      </div>

      <div className="flex flex-col flex-1" style={{ position: 'relative', zIndex: 1 }}>

        <nav className="flex items-center px-8 py-4 border-b border-white/10"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
          <Link to="/" className="font-black text-sm tracking-widest text-white">
            BANDIFY
          </Link>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-14">
          <div className="w-full max-w-sm">
            <div className="rounded-2xl p-8 border border-white/10"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>

              {/* ── Tabs login / registro ── */}
              {(view === 'login' || view === 'register') && (
                <>
                  <div className="flex gap-6 mb-7 border-b border-white/10 pb-4">
                    <TabBtn active={view === 'register'} onClick={() => switchTo('register')}>Crear cuenta</TabBtn>
                    <TabBtn active={view === 'login'}    onClick={() => switchTo('login')}>Iniciar sesión</TabBtn>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {view === 'register' && (
                      <>
                        <Field name="username" label="Nombre de usuario" placeholder="janesmithmusic" required />
                        <Field name="fecha_nacimiento" label="Fecha de nacimiento" type="date" />
                      </>
                    )}
                    {view === 'login' ? (
                      <Field name="identifier" label="Correo o nombre de usuario" placeholder="info@example.com o janesmithmusic" type="text" required />
                    ) : (
                      <Field name="email" label="Correo electrónico" placeholder="info@example.com" type="email" required />
                    )}

                    {view === 'register' ? (
                      <>
                        <PasswordField
                          name="password"
                          label="Contraseña"
                          placeholder="••••••••"
                          required
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                        />
                        <PasswordField
                          name="confirm_password"
                          label="Confirmar contraseña"
                          placeholder="••••••••"
                          required
                          value={regConfirm}
                          onChange={e => setRegConfirm(e.target.value)}
                          hasError={!!passwordMismatch}
                          errorMsg="Las contraseñas no coinciden"
                        />
                      </>
                    ) : (
                      <PasswordField name="password" label="Contraseña" placeholder="••••••••" required />
                    )}

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <SubmitBtn
                      pending={authMutation.isPending}
                      disabled={view === 'register' && regFormInvalid}
                    >
                      {view === 'login' ? 'Iniciar sesión' : 'Crear mi perfil'}
                    </SubmitBtn>
                  </form>

                  {view === 'login' && (
                    <button
                      onClick={() => switchTo('forgot')}
                      className="mt-4 w-full text-center text-white/40 text-xs hover:text-white/70 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </>
              )}

              {/* ── Vista: Solicitar reset ── */}
              {view === 'forgot' && (
                <>
                  <BackLink onClick={() => switchTo('login')} />
                  <h2 className="text-white font-bold text-lg mb-2">Recuperar contraseña</h2>
                  <p className="text-white/50 text-sm mb-6 leading-relaxed">
                    Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
                  </p>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Field name="email" label="Correo electrónico" placeholder="info@example.com" type="email" required />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <SubmitBtn pending={forgotMutation.isPending}>Enviar enlace</SubmitBtn>
                  </form>
                </>
              )}

              {/* ── Vista: Confirmación de envío ── */}
              {view === 'sent' && (
                <div className="flex flex-col items-center text-center gap-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle size={26} className="text-green-400" />
                  </div>
                  <h2 className="text-white font-bold text-lg">Revisa tu correo</h2>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Si existe una cuenta con ese email, recibirás un enlace para
                    restablecer tu contraseña. El enlace expira en 1 hora.
                  </p>
                  <button onClick={() => switchTo('login')} className="text-white/50 text-xs hover:text-white/80 transition-colors mt-2">
                    Volver al inicio de sesión
                  </button>
                </div>
              )}

              {/* ── Vista: Nueva contraseña ── */}
              {view === 'reset' && (
                <>
                  <h2 className="text-white font-bold text-lg mb-2">Nueva contraseña</h2>
                  <p className="text-white/50 text-sm mb-6">Elige una contraseña de al menos 8 caracteres.</p>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <PasswordField name="password" label="Nueva contraseña" placeholder="••••••••" required />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    {resetMutation.isSuccess && (
                      <p className="text-green-400 text-sm">✓ Contraseña actualizada. Ahora puedes iniciar sesión.</p>
                    )}
                    <SubmitBtn pending={resetMutation.isPending}>Guardar contraseña</SubmitBtn>
                  </form>
                </>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ─── helpers ─── */

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
      active ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'
    }`}>
      {children}
    </button>
  )
}

function BackLink({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-white/40 text-xs hover:text-white/70 transition-colors mb-5">
      <ArrowLeft size={12} /> Volver
    </button>
  )
}

function SubmitBtn({ pending, disabled, children }) {
  const isDisabled = pending || !!disabled
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={`w-full font-semibold py-3.5 rounded-full text-sm transition-all mt-1 ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{ backgroundColor: '#ffffff', color: '#000000' }}
      onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.backgroundColor = '#e7e5e4' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff' }}
    >
      {pending ? 'Cargando...' : children}
    </button>
  )
}

function Field({ name, label, placeholder, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">{label}</label>
      <input name={name} type={type} placeholder={placeholder} required={required}
        className="w-full bg-white/8 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/30 border border-white/10" />
    </div>
  )
}

function PasswordField({ name, label, placeholder, required = false, value, onChange, hasError = false, errorMsg = '' }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          className={`w-full bg-white/8 text-white placeholder-white/25 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 border transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
            hasError
              ? 'border-red-500 focus:ring-red-500/30'
              : 'border-white/10 focus:ring-white/30'
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hasError && errorMsg && (
        <p className="text-red-400 text-xs mt-1.5">{errorMsg}</p>
      )}
    </div>
  )
}
