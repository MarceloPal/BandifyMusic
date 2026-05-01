import SoftAurora from './SoftAurora'
import './AudioAnalysisLoader.css'

const BAR_DELAYS = [0, 0.15, 0.3, 0.1, 0.25, 0.05, 0.2, 0.35, 0.12]
const BAR_HEIGHTS = [28, 44, 56, 36, 64, 40, 52, 32, 48]

const STEPS = [
  { until: 6,  label: 'Subiendo' },
  { until: 18, label: 'Descargando' },
  { until: 38, label: 'Analizando' },
  { until: 58, label: 'Calculando ADN' },
  { until: Infinity, label: 'Finalizando' },
]

function StepDots({ secs }) {
  const activeIdx = STEPS.findIndex((s) => secs < s.until)
  return (
    <div className="flex items-center gap-2 justify-center mt-5">
      {STEPS.map((s, i) => (
        <div key={s.label} className="flex flex-col items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full transition-all duration-500 ${
              i < activeIdx
                ? 'bg-purple-300'
                : i === activeIdx
                ? 'bg-purple-600 scale-125'
                : 'bg-zinc-700'
            }`}
          />
        </div>
      ))}
    </div>
  )
}

export default function AudioAnalysisLoader({ progressText, progressSub, isHifi, secs = 0 }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-800 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl">

        {/* ── Visual header with aurora + equalizer bars ── */}
        <div className="relative h-40 bg-purple-600 overflow-hidden flex items-center justify-center">
          <SoftAurora
            color1="#7c3aed"
            color2="#c084fc"
            speed={0.5}
            brightness={1.1}
            scale={1.8}
            bandHeight={0.5}
            bandSpread={1.2}
            enableMouseInteraction={false}
          />

          {/* Equalizer bars */}
          <div className="absolute inset-0 flex items-center justify-center gap-1.5">
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="aal-bar w-1.5 rounded-full bg-white/85"
                style={{
                  height: `${h}px`,
                  animationDelay: `${BAR_DELAYS[i]}s`,
                  animationDuration: `${0.9 + i * 0.04}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-8 pt-7 pb-8 text-center">

          {/* Pulsing icon */}
          <div className="aal-pulse w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center mx-auto mb-5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>

          <p className="text-zinc-100 font-bold text-lg leading-tight">{progressText}</p>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{progressSub}</p>

          <StepDots secs={secs} />

          {/* Hi-Fi notice */}
          {isHifi && (
            <div className="mt-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left">
              <span className="text-amber-500 text-sm leading-none mt-0.5 flex-shrink-0">✦</span>
              <p className="text-amber-700 text-xs leading-relaxed">
                <span className="font-bold">Archivo de alta fidelidad</span> — el análisis tardará
                un poco más para garantizar la precisión de tu ADN.
              </p>
            </div>
          )}

          <p className="text-zinc-600 text-xs mt-5">
            Puede tardar hasta 1 minuto · no cierres la ventana
          </p>
        </div>
      </div>
    </div>
  )
}
