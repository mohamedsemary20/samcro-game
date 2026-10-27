export function productionReleaseTarget(environment: Record<string, string | undefined>): {
  address: string
  databaseName: string
}
