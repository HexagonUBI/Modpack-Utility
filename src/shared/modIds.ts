export const IMPLICIT_MOD_IDS: ReadonlySet<string> = new Set([
  'minecraft',
  'java',
  'forge',
  'neoforge',
  'fml',
  'fabric',
  'fabricloader',
  'fabric-loader',
  'quilt_loader',
  'quilt_base',
  'quilted_fabric_api',
  'mixinextras'
])

export function isImplicitModId(modId: string): boolean {
  return IMPLICIT_MOD_IDS.has(modId.toLowerCase())
}
