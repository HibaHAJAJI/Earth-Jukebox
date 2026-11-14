import { useEffect, useState } from 'react'
import { getSonificationEngine, subscribeToSonificationEngine } from '../services/sonificationService'

export default function useSonificationEngine() {
  const [engine, setEngine] = useState(() => getSonificationEngine())

  useEffect(() => subscribeToSonificationEngine(setEngine), [])

  return {
    engine,
    isConnected: engine?.isConnected === true,
  }
}
