import { EventEmitter, requireOptionalNativeModule } from 'expo-modules-core'

export interface LanHostStarted { port: number; addresses: string[] }
export type LanNativeEvent =
  | { type: 'listening'; port: number }
  | { type: 'connected'; clientId: string; address: string }
  | { type: 'disconnected'; clientId: string; code: number }
  | { type: 'message'; clientId: string; data: string }
  | { type: 'transportError'; clientId?: string | null }

interface NativeLanModule {
  startHost(port: number): Promise<LanHostStarted>
  sendToClient(clientId: string, message: string): Promise<boolean>
  closeClient(clientId: string): Promise<boolean>
  broadcast(message: string): Promise<boolean>
  stopHost(): Promise<boolean>
  getAddresses(): Promise<string[]>
}

const nativeLan = requireOptionalNativeModule<NativeLanModule>('SamkaroLan')
const emitter = nativeLan ? new EventEmitter(nativeLan as never) : null

function requireLanModule(): NativeLanModule {
  if (!nativeLan) throw new Error('ANDROID_LAN_MODULE_UNAVAILABLE')
  return nativeLan
}

export const LanHost = {
  start: (port = 0) => requireLanModule().startHost(port),
  send: (clientId: string, message: string) => requireLanModule().sendToClient(clientId, message),
  closeClient: (clientId: string) => requireLanModule().closeClient(clientId),
  broadcast: (message: string) => requireLanModule().broadcast(message),
  stop: () => requireLanModule().stopHost(),
  addresses: () => requireLanModule().getAddresses(),
  addListener: (listener: (event: LanNativeEvent) => void) => {
    if (!emitter) throw new Error('ANDROID_LAN_MODULE_UNAVAILABLE')
    return emitter.addListener('onLanEvent' as never, listener as never)
  },
}
