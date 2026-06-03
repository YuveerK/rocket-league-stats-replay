export const PLAYLIST_LABELS = {
  1: 'Casual Duel',
  2: 'Casual Doubles',
  3: 'Casual Standard',
  4: 'Chaos',
  10: 'Ranked Duel',
  11: 'Ranked Doubles',
  12: 'Ranked Solo Standard',
  13: 'Ranked Standard',
  27: 'Hoops',
  28: 'Rumble',
  29: 'Dropshot',
  30: 'Snow Day',
  34: 'Tournament',
  46: 'Heatseeker',
}

export const MAP_LABELS = {
  cs_day_p: 'Champions Field',
  stadium_day_p: 'DFH Stadium',
  EuroStadium_Rainy_P: 'Mannfield (Stormy)',
  Paname_Dusk_P: 'Paname Arena',
  Park_Rainy_P: 'Beckwith Park (Stormy)',
  Park_Night_P: 'Beckwith Park (Midnight)',
  TrainStation_Night_P: 'Urban Central (Night)',
  Utopolis_Dusk_P: 'Utopia Coliseum (Dusk)',
  HoopsStadium_P: 'Dunk House',
  Wasteland_P: 'Wasteland',
}

export function mapLabel(raw) {
  if (!raw) return 'Unknown map'
  return MAP_LABELS[raw] ?? raw.replace(/_P$/i, '').replace(/_/g, ' ')
}

export function playlistLabel(id) {
  return PLAYLIST_LABELS[id] ?? (id != null ? `Playlist ${id}` : 'Unknown playlist')
}

export function parseReplayDate(value) {
  if (!value) return null
  const normalized = String(value).replace(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})-(\d{2})$/,
    '$1-$2-$3T$4:$5:$6',
  )
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatReplayDate(value) {
  const date = parseReplayDate(value)
  if (!date) return 'Unknown date'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatShortReplayDate(value) {
  const date = parseReplayDate(value)
  if (!date) return 'N/A'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
