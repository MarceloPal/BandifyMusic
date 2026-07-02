import { describe, it, expect } from 'vitest'
import { getInitials } from './helpers'

describe('getInitials', () => {
  it('retorna "?" cuando el nombre es null', () => {
    expect(getInitials(null)).toBe('?')
  })

  it('retorna "?" cuando el nombre es undefined', () => {
    expect(getInitials(undefined)).toBe('?')
  })

  it('retorna "?" cuando el nombre es cadena vacía', () => {
    expect(getInitials('')).toBe('?')
  })

  it('retorna iniciales en mayúsculas para nombre simple', () => {
    expect(getInitials('juan')).toBe('J')
  })

  it('retorna dos iniciales para nombre completo', () => {
    expect(getInitials('Juan Pérez')).toBe('JP')
  })

  it('retorna máximo 2 caracteres con nombre de tres palabras', () => {
    expect(getInitials('Juan Carlos Pérez')).toBe('JC')
  })

  it('convierte a mayúsculas correctamente', () => {
    expect(getInitials('ana mora')).toBe('AM')
  })
})
