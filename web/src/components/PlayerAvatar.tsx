const tones = new Set<number>([0, 1, 2, 3, 4])

function toneFor(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }
  return Math.abs(hash) % 5
}

export function PlayerAvatar({
  name,
  playerId,
  avatarUrl,
  size = 'md',
  className = '',
}: {
  name: string
  playerId: string
  avatarUrl?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const tone = toneFor(playerId || name)
  const safeTone = tones.has(tone) ? tone : 0
  return <span className={`player-avatar avatar-${size} avatar-tone-${safeTone} ${className}`.trim()} aria-hidden="true">
    {avatarUrl ? <img src={avatarUrl} alt="" loading="lazy" /> : <bdi>{name.trim().slice(0, 1) || '؟'}</bdi>}
  </span>
}
