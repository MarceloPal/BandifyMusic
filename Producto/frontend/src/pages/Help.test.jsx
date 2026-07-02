import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Help from './Help'

function renderHelp() {
  return render(
    <MemoryRouter>
      <Help />
    </MemoryRouter>
  )
}

describe('Help', () => {
  it('muestra el título "Ayuda"', () => {
    renderHelp()
    expect(screen.getByText('Ayuda')).toBeInTheDocument()
  })

  it('muestra las 9 preguntas del FAQ', () => {
    renderHelp()
    expect(screen.getByText('¿Cómo funciona el análisis de Inteligencia Artificial?')).toBeInTheDocument()
    expect(screen.getByText('¿Qué archivos puedo subir si tengo cuenta gratuita?')).toBeInTheDocument()
    expect(screen.getByText('¿Cómo encuentro músicos similares a mí?')).toBeInTheDocument()
    expect(screen.getByText('¿Qué beneficios tiene la suscripción Premium?')).toBeInTheDocument()
    expect(screen.getByText('¿Es seguro ingresar mis datos de pago?')).toBeInTheDocument()
    expect(screen.getByText('¿Cómo publico una tocata en el mapa?')).toBeInTheDocument()
    expect(screen.getByText('¿Cómo funciona la venta de tickets para mi tocata?')).toBeInTheDocument()
    expect(screen.getByText('¿Mi música está protegida contra descargas?')).toBeInTheDocument()
    expect(screen.getByText('¿Cómo hablo con alguien para colaborar?')).toBeInTheDocument()
  })

  it('las respuestas están ocultas por defecto', () => {
    renderHelp()
    expect(screen.queryByText(/ADN Musical.*único basado/)).not.toBeInTheDocument()
  })

  it('muestra la respuesta al hacer clic en una pregunta', () => {
    renderHelp()
    fireEvent.click(screen.getByText('¿Cómo funciona el análisis de Inteligencia Artificial?'))
    expect(screen.getByText(/ADN Musical.*único basado/)).toBeInTheDocument()
  })

  it('oculta la respuesta al hacer clic de nuevo', () => {
    renderHelp()
    const btn = screen.getByText('¿Cómo funciona el análisis de Inteligencia Artificial?')
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText(/ADN Musical.*único basado/)).not.toBeInTheDocument()
  })

  it('puede abrir múltiples preguntas a la vez', () => {
    renderHelp()
    fireEvent.click(screen.getByText('¿Cómo funciona el análisis de Inteligencia Artificial?'))
    fireEvent.click(screen.getByText('¿Cómo encuentro músicos similares a mí?'))
    expect(screen.getByText(/ADN Musical.*único basado/)).toBeInTheDocument()
    expect(screen.getByText(/Comparamos matemáticamente tu ADN/)).toBeInTheDocument()
  })

  it('muestra el link al Centro de Soporte', () => {
    renderHelp()
    const link = screen.getByText('Ir al Centro de Soporte')
    expect(link.closest('a')).toHaveAttribute('href', '/soporte')
  })
})
