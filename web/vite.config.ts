import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', 'VITE_')
  const demoEntry = mode === 'development' && environment.VITE_APP_MODE === 'demo-local'
    ? './src/DemoApp.tsx'
    : './src/UnavailableDemoApp.tsx'
  return {
    plugins: [react()],
    resolve: { alias: [{ find: './DemoApp', replacement: demoEntry.replace('./src', '/src') }] },
    server: { fs: { allow: ['..'], deny: ['**/questions/**'] } },
  }
})
