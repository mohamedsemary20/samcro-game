type IconName = 'home' | 'users' | 'trophy' | 'user' | 'copy' | 'arrow' | 'crown' | 'wifi' | 'download' | 'close' | 'sparkle' | 'refresh'

const paths: Record<IconName, string> = {
  home: 'M3 10.7 12 3l9 7.7v9.1a1.2 1.2 0 0 1-1.2 1.2h-5.2v-6.4h-5.2V21H4.2A1.2 1.2 0 0 1 3 19.8z',
  users: 'M16 21v-1.7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V21m7-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-7.6a4 4 0 0 1 0 7.2m5 9.4v-1.7a4 4 0 0 0-3-3.9',
  trophy: 'M8 21h8m-4-4v4m-6-18h12v5a6 6 0 0 1-12 0zm12 2h4v2a4 4 0 0 1-4 4M6 5H2v2a4 4 0 0 0 4 4',
  user: 'M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  copy: 'M8 8V4.8A1.8 1.8 0 0 1 9.8 3h9.4A1.8 1.8 0 0 1 21 4.8v9.4a1.8 1.8 0 0 1-1.8 1.8H16M4.8 8H14a2 2 0 0 1 2 2v9.2a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 19.2V9.8A1.8 1.8 0 0 1 4.8 8Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  crown: 'm2.8 7 4.7 4 4.5-7 4.5 7 4.7-4-1.8 12H4.6L2.8 7Zm2 15h14.4',
  wifi: 'M5 12.5a10.2 10.2 0 0 1 14 0M8.2 15.7a5.7 5.7 0 0 1 7.6 0M11 18.5a1.8 1.8 0 0 1 2 0M3 5l18 14',
  download: 'M12 3v12m-5-5 5 5 5-5M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  close: 'm18 6-12 12M6 6l12 12',
  sparkle: 'm12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z',
  refresh: 'M20 7v5h-5M4 17v-5h5m-4.1-2A7 7 0 0 1 17 6.2L20 12M4 12l3 5.8A7 7 0 0 0 19.1 14',
}

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>
}
