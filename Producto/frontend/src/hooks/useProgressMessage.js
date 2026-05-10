/**
 * Hook que produce mensajes de progreso "narrados" para el flujo de análisis
 * de audio (Onboarding y Mi ADN). Cuenta segundos mientras `isActive` sea true
 * y devuelve un objeto con texto principal, subtítulo y segundos transcurridos.
 *
 * El timer se resetea automáticamente al volver a `isActive=false`.
 *
 * @param {boolean} isActive — true mientras dura la subida + análisis
 * @returns {{ text: string, sub: string, secs: number }}
 *
 * @example
 *   const { text, sub } = useProgressMessage(isProcessing)
 */

import { useEffect, useState } from 'react'

export function useProgressMessage(isActive) {
  const [secs, setSecs] = useState(0)
  const [prevIsActive, setPrevIsActive] = useState(isActive)

  // Reset al desactivar — patrón oficial de React, sin useEffect.
  // https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
  if (prevIsActive !== isActive) {
    setPrevIsActive(isActive)
    if (!isActive) setSecs(0)
  }

  useEffect(() => {
    if (!isActive) return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [isActive])

  if (!isActive) return { text: '', sub: '', secs: 0 }
  if (secs < 6)  return { text: 'Subiendo archivo...',     sub: 'Transfiriendo a la nube',                                          secs }
  if (secs < 18) return { text: 'Descargando audio...',    sub: 'El servicio de IA está obteniendo el archivo de S3',              secs }
  if (secs < 38) return { text: 'Analizando segmentos...', sub: 'Procesando MFCCs, Chroma y HPSS en 3 ventanas',                   secs }
  if (secs < 58) return { text: 'Calculando ADN musical...', sub: 'Aplicando votación y promediando segmentos ganadores',          secs }
  return           { text: 'Finalizando análisis...',      sub: 'Casi listo — guardando resultados',                                secs }
}
