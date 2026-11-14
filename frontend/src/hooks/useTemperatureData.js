import { useCallback, useEffect, useState } from 'react'
import { fetchTemperatureDataset, getDatasetMetadata, getMonthlyData } from '../services/temperatureService'

const initialState = {
  status: 'loading',
  dataset: null,
  metadata: null,
  records: [],
  error: null,
}

export default function useTemperatureData() {
  const [state, setState] = useState(initialState)
  const [requestId, setRequestId] = useState(0)

  const reload = useCallback(() => {
    setState({ ...initialState })
    setRequestId((current) => current + 1)
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadDataset() {
      try {
        const dataset = await fetchTemperatureDataset()

        if (!isActive) {
          return
        }

        setState({
          status: 'ready',
          dataset,
          metadata: getDatasetMetadata(dataset),
          records: getMonthlyData(dataset),
          error: null,
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          status: 'error',
          dataset: null,
          metadata: null,
          records: [],
          error: error instanceof Error ? error.message : 'Unable to load temperature data.',
        })
      }
    }

    loadDataset()

    return () => {
      isActive = false
    }
  }, [requestId])

  return { ...state, reload }
}
