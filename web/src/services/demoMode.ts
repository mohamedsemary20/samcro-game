/** Demo fixtures are opt-in in development only; production always uses the server app. */
export const APP_MODE = import.meta.env.DEV && import.meta.env.VITE_APP_MODE === 'demo-local'
  ? 'demo-local'
  : 'server'
