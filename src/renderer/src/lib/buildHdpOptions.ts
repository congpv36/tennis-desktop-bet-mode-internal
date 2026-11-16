type BetOption = {
  key: string
  label: string
}

export const buildHdpOptions = (type: string): BetOption[] => {
  let maxValue = 0

  switch (type) {
    case 'SET_FT_HDP':
      maxValue = 2.5
      break
    case 'SET_1ST_GAME_OU':
      maxValue = 13
      break
    case 'GAME_FT_HDP':
      maxValue = 18
      break
    case 'GAME_FT_OU':
      maxValue = 65
      break
    default:
      return [{ key: 'betAll', label: 'Bet All' }]
  }

  const options: BetOption[] = [{ key: 'betAll', label: 'Bet All' }]

  for (let value = 0; value <= maxValue; value += 0.25) {
    const key = `hdp_${value.toString().replace('.', '_')}`
    const label = value.toString()
    options.push({ key, label })
  }

  return options
}

export const getHdpOptionsByLineKey = (lineKey: string) => {
  if (['SET_FT_HDP_PUT', 'SET_FT_HDP_EAT'].includes(lineKey)) {
    return buildHdpOptions('SET_FT_HDP')
  }

  if (['SET_1ST_GAME_OVER', 'SET_1ST_GAME_UNDER'].includes(lineKey)) {
    return buildHdpOptions('SET_1ST_GAME_OU')
  }

  if (['GAME_FT_HDP_PUT', 'GAME_FT_HDP_EAT'].includes(lineKey)) {
    return buildHdpOptions('GAME_FT_HDP')
  }

  return buildHdpOptions('GAME_FT_OU')
}
