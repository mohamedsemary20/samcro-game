import { useEffect, useState } from 'react'
import { getOfflineRuntime, subscribeOfflineRuntime, type OfflineRuntimeState } from './runtime'

export function useOfflineRuntime(): OfflineRuntimeState {
  const [value, setValue] = useState(getOfflineRuntime())
  useEffect(() => subscribeOfflineRuntime(setValue), [])
  return value
}
