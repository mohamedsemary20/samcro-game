const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')
const config = getDefaultConfig(projectRoot)

// Shared contracts remain at the repository root to preserve current web/server imports.
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// The server and shared packages use NodeNext `.js` specifiers in their TypeScript
// source. Metro must resolve those specifiers to the corresponding workspace `.ts`
// source while keeping Node's emitted ESM imports unchanged.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    return context.resolveRequest(context, moduleName, platform)
  } catch (error) {
    if (!moduleName.endsWith('.js')) throw error
    return context.resolveRequest(context, `${moduleName.slice(0, -3)}.ts`, platform)
  }
}

module.exports = config
