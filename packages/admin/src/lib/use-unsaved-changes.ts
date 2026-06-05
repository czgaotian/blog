import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

export function useUnsavedChanges(isDirty: boolean) {
  const allowNavigationRef = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    isDirty
    && !allowNavigationRef.current
    && currentLocation.pathname !== nextLocation.pathname
  ))

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Discard your unsaved changes?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    function preventAccidentalClose(event: BeforeUnloadEvent) {
      if (!isDirty) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', preventAccidentalClose)
    return () => window.removeEventListener('beforeunload', preventAccidentalClose)
  }, [isDirty])

  return useCallback(() => {
    allowNavigationRef.current = true
  }, [])
}
