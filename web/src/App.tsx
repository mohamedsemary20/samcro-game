import { lazy, Suspense } from 'react'
import { LoadingState } from './components/LoadingState'
import { APP_MODE } from './services/demoMode'

const DemoApp = lazy(() => import('./DemoApp'))
const ServerApp = lazy(() => import('./ServerApp'))

export default function App() {
  const Application = APP_MODE === 'demo-local' ? DemoApp : ServerApp
  return <Suspense fallback={<LoadingState />}><Application /></Suspense>
}
