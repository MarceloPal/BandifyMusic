import { Music } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/8 px-6 py-6 flex-shrink-0">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-white">
          <Music size={13} />
          <span className="font-black text-sm tracking-widest">BANDIFY</span>
        </div>

        <p className="text-white/30 text-xs text-center">
          © {new Date().getFullYear()} Bandify — Plataforma para músicos independientes en Chile
        </p>

        <div className="flex gap-5 text-xs text-white/40">
          <a href="#" className="hover:text-white transition-colors">Términos</a>
          <a href="#" className="hover:text-white transition-colors">Privacidad</a>
          <a href="#" className="hover:text-white transition-colors">Contacto</a>
        </div>
      </div>
    </footer>
  )
}
