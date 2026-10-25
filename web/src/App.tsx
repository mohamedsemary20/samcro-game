import { lazy, Suspense } from 'react'
import { APP_MODE } from './services/demoMode'

const DemoApp = lazy(() => import('./DemoApp'))
const ServerApp = lazy(() => import('./ServerApp'))

export default function App() {
  const Application = APP_MODE === 'demo-local' ? DemoApp : ServerApp
  return <Suspense fallback={<main className="sam-state-card" role="status"><span className="sam-spinner" /><h1>بنجهّز سمكرو</h1><p>ثواني ونكون معاك…</p></main>}><Application /></Suspense>
}
