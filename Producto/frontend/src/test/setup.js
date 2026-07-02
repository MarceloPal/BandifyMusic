import '@testing-library/jest-dom'

// jsdom no implementa ResizeObserver — lo usan varios componentes (ej. GooeyNav).
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
