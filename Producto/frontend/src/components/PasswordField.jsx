import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordField({
  name,
  label,
  placeholder = '••••••••',
  required = false,
  value,
  onChange,
  hasError = false,
  errorMsg = '',
  variant = 'default',
}) {
  const [show, setShow] = useState(false)

  const labelCls = variant === 'settings'
    ? 'block text-white/60 text-xs font-semibold uppercase tracking-wide mb-1.5'
    : 'block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide'

  const inputCls = variant === 'settings'
    ? 'w-full bg-white/5 border rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden'
    : 'w-full bg-white/8 text-white placeholder-white/25 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 border transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden'

  const errorBorderCls = variant === 'settings'
    ? 'border-red-500 focus:ring-red-500/40'
    : 'border-red-500 focus:ring-red-500/30'

  const normalBorderCls = variant === 'settings'
    ? 'border-white/10 focus:ring-purple-500/50'
    : 'border-white/10 focus:ring-white/30'

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          name={name}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          className={`${inputCls} ${hasError ? errorBorderCls : normalBorderCls}`}
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
