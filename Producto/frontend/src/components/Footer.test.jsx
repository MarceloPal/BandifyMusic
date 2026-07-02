import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from './Footer'

function renderFooter(props) {
  return render(
    <MemoryRouter>
      <Footer {...props} />
    </MemoryRouter>
  )
}

describe('Footer', () => {
  it('muestra el nombre de la marca (BANDIFY)', () => {
    renderFooter()
    expect(screen.getByText('BANDIFY')).toBeInTheDocument()
  })

  it('muestra el copyright de Bandify', () => {
    renderFooter()
    expect(screen.getByText(/Bandify © 2026/)).toBeInTheDocument()
  })

  it('muestra los enlaces de Términos y Condiciones y Política de privacidad', () => {
    renderFooter()
    expect(screen.getByText('Términos y Condiciones')).toBeInTheDocument()
    expect(screen.getByText('Política de privacidad')).toBeInTheDocument()
  })

  it('renderiza el elemento footer en el DOM', () => {
    const { container } = renderFooter()
    expect(container.querySelector('footer')).toBeInTheDocument()
  })
})
