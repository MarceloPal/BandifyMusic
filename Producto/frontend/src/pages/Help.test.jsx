import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Help from './Help'

describe('Help', () => {
  it('muestra el título "Ayuda"', () => {
    render(<Help />)
    expect(screen.getByText('Ayuda')).toBeInTheDocument()
  })

  it('muestra las 6 preguntas del FAQ', () => {
    render(<Help />)
    expect(screen.getByText('¿Cómo funciona el análisis?')).toBeInTheDocument()
    expect(screen.getByText('¿Cómo encuentro músicos similares?')).toBeInTheDocument()
    expect(screen.getByText('¿Cómo actualizo mi sonido?')).toBeInTheDocument()
    expect(screen.getByText('¿Qué archivos puedo subir?')).toBeInTheDocument()
    expect(screen.getByText('¿Mi música está protegida?')).toBeInTheDocument()
    expect(screen.getByText('¿Cómo hablo con alguien?')).toBeInTheDocument()
  })

  it('las respuestas están ocultas por defecto', () => {
    render(<Help />)
    expect(screen.queryByText(/ADN Musical.*único basado/)).not.toBeInTheDocument()
  })

  it('muestra la respuesta al hacer clic en una pregunta', () => {
    render(<Help />)
    fireEvent.click(screen.getByText('¿Cómo funciona el análisis?'))
    expect(screen.getByText(/ADN Musical.*único basado/)).toBeInTheDocument()
  })

  it('oculta la respuesta al hacer clic de nuevo', () => {
    render(<Help />)
    const btn = screen.getByText('¿Cómo funciona el análisis?')
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText(/ADN Musical.*único basado/)).not.toBeInTheDocument()
  })

  it('puede abrir múltiples preguntas a la vez', () => {
    render(<Help />)
    fireEvent.click(screen.getByText('¿Cómo funciona el análisis?'))
    fireEvent.click(screen.getByText('¿Cómo encuentro músicos similares?'))
    expect(screen.getByText(/ADN Musical.*único basado/)).toBeInTheDocument()
    expect(screen.getByText(/Comparamos tu ADN/)).toBeInTheDocument()
  })

  it('muestra el link de contacto a soporte@bandify.cl', () => {
    render(<Help />)
    const link = screen.getByText('soporte@bandify.cl')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', 'mailto:soporte@bandify.cl')
  })
})
