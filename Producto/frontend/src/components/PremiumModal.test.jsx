import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PremiumModal from './PremiumModal'

describe('PremiumModal', () => {
  it('muestra el título del modal', () => {
    render(<PremiumModal onClose={() => {}} />)
    expect(screen.getByText('Límite de demos alcanzado')).toBeInTheDocument()
  })

  it('muestra los 3 beneficios premium', () => {
    render(<PremiumModal onClose={() => {}} />)
    expect(screen.getByText('Demos ilimitados en tu repertorio')).toBeInTheDocument()
    expect(screen.getByText('Análisis de audio prioritario')).toBeInTheDocument()
    expect(screen.getByText('Destacado en resultados de Explorar')).toBeInTheDocument()
  })

  it('llama onClose al hacer clic en el overlay', () => {
    const onClose = vi.fn()
    const { container } = render(<PremiumModal onClose={onClose} />)
    // El overlay es el div externo (primer hijo del fragment)
    fireEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('llama onClose al hacer clic en el botón X', () => {
    const onClose = vi.fn()
    render(<PremiumModal onClose={onClose} />)
    // Busca el botón con el ícono de cerrar (aria sin label, buscamos por posición)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0]) // primer botón = X
    expect(onClose).toHaveBeenCalled()
  })

  it('llama onClose al hacer clic en "Continuar con cuenta gratuita"', () => {
    const onClose = vi.fn()
    render(<PremiumModal onClose={onClose} />)
    fireEvent.click(screen.getByText('Continuar con cuenta gratuita'))
    expect(onClose).toHaveBeenCalled()
  })

  it('llama onClose al hacer clic en el CTA de Premium', () => {
    const onClose = vi.fn()
    render(<PremiumModal onClose={onClose} />)
    fireEvent.click(screen.getByText(/Quiero ser Premium/))
    expect(onClose).toHaveBeenCalled()
  })

  it('no propaga el clic del overlay al hacer clic dentro de la card', () => {
    const onClose = vi.fn()
    render(<PremiumModal onClose={onClose} />)
    fireEvent.click(screen.getByText('Límite de demos alcanzado'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
