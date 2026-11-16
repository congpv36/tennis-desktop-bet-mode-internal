import { v4 as uuidv4 } from 'uuid'

export const ALLOWED_PLATFORM_NAMES = [
  '3in1Bet',
  'Sbobet',
  'Viva88Bet',
  'WBet',
  'Ps3838',
  'SingBet',
  '1XBet',
  'DafaBet',
  'FishBet88'
] as const

export type AllowedPlatformName = (typeof ALLOWED_PLATFORM_NAMES)[number]

const ALLOWED_PLATFORM_NAME_SET: ReadonlySet<string> = new Set(ALLOWED_PLATFORM_NAMES)

export const isAllowedPlatform = (name?: string | null): name is AllowedPlatformName =>
  !!name && ALLOWED_PLATFORM_NAME_SET.has(name)

export const TARGET_TYPE = {
  FIRST_SET: 'FIRST_SET',
  GAME: 'GAME',
  SECOND_SET: 'SECOND_SET',
  SET: 'SET'
}

export const BET_MODES = {
  Auto: 'Auto',
  HomeOnly: 'HomeOnly',
  AwayOnly: 'AwayOnly'
} as const

export const MAJOR_LEAGUE = [
  { league: '%England - Premier League' },
  { league: '%England - Championship' },
  { league: '%France - Ligue 1' },
  { league: '%Germany - Bundesliga' },
  { league: '%Italy - Serie A' },
  { league: '%Spain - La Liga' },
  { league: '%UEFA - Champions League' },
  { league: '%UEFA - Europa League' }
]

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const

export const CONVERT_HDP = {
  '45.25': '45-45.5',
  '44.75': '44.5-45',
  '45.75': '45.5-46',
  '44.25': '44-44.5',
  '46.25': '46-46.5',
  '43.75': '43.5-44',
  '46.75': '46.5-47',
  '43.25': '43-43.5',
  '47.25': '47-47.5',
  '42.75': '42.5-43',
  '47.75': '47.5-48',
  '42.25': '42-42.5',
  '48.25': '48-48.5',
  '41.75': '41.5-42',
  '48.75': '48.5-49',
  '41.25': '41-41.5',
  '49.25': '49-49.5',
  '40.75': '40.5-41',
  '49.75': '49.5-50',
  '40.25': '40-40.5',
  '50': '50',
  '39.75': '39.5-40',
  '49.5': '49.5',
  '39.25': '39-39.5',
  '49': '49',
  '38.75': '38.5-39',
  '48.5': '48.5',
  '38.25': '38-38.5',
  '48': '48',
  '37.75': '37.5-38',
  '47.5': '47.5',
  '37.25': '37-37.5',
  '47': '47',
  '36.75': '36.5-37',
  '46.5': '46.5',
  '36.25': '36-36.5',
  '46': '46',
  '35.75': '35.5-36',
  '45.5': '45.5',
  '35.25': '35-35.5',
  '45': '45',
  '34.75': '34.5-35',
  '44.5': '44.5',
  '34.25': '34-34.5',
  '44': '44',
  '33.75': '33.5-34',
  '43.5': '43.5',
  '33.25': '33-33.5',
  '43': '43',
  '32.75': '32.5-33',
  '42.5': '42.5',
  '32.25': '32-32.5',
  '42': '42',
  '31.75': '31.5-32',
  '41.5': '41.5',
  '31.25': '31-31.5',
  '41': '41',
  '30.75': '30.5-31',
  '40.5': '40.5',
  '30.25': '30-30.5',
  '40': '40',
  '29.75': '29.5-30',
  '39.5': '39.5',
  '29.25': '29-29.5',
  '39': '39',
  '28.75': '28.5-29',
  '38.5': '38.5',
  '28.25': '28-28.5',
  '38': '38',
  '27.75': '27.5-28',
  '37.5': '37.5',
  '27.25': '27-27.5',
  '37': '37',
  '26.75': '26.5-27',
  '36.5': '36.5',
  '26.25': '26-26.5',
  '36': '36',
  '25.75': '25.5-26',
  '35.5': '35.5',
  '25.25': '25-25.5',
  '35': '35',
  '24.75': '24.5-25',
  '34.5': '34.5',
  '24.25': '24-24.5',
  '34': '34',
  '23.75': '23.5-24',
  '33.5': '33.5',
  '23.25': '23-23.5',
  '33': '33',
  '22.75': '22.5-23',
  '32.5': '32.5',
  '22.25': '22-22.5',
  '32': '32',
  '21.75': '21.5-22',
  '31.5': '31.5',
  '21.25': '21-21.5',
  '31': '31',
  '20.75': '20.5-21',
  '30.5': '30.5',
  '20.25': '20-20.5',
  '30': '30',
  '19.75': '19.5-20',
  '29.5': '29.5',
  '19.25': '19-19.5',
  '29': '29',
  '18.75': '18.5-19',
  '28.5': '28.5',
  '18.25': '18-18.5',
  '28': '28',
  '17.75': '17.5-18',
  '27.5': '27.5',
  '17.25': '17-17.5',
  '27': '27',
  '16.75': '16.5-17',
  '26.5': '26.5',
  '16.25': '16-16.5',
  '26': '26',
  '15.75': '15.5-16',
  '25.5': '25.5',
  '15.25': '15-15.5',
  '25': '25',
  '14.75': '14.5-15',
  '24.5': '24.5',
  '14.25': '14-14.5',
  '24': '24',
  '13.75': '13.5-14',
  '23.5': '23.5',
  '13.25': '13-13.5',
  '23': '23',
  '12.75': '12.5-13',
  '22.5': '22.5',
  '12.25': '12-12.5',
  '22': '22',
  '11.75': '11.5-12',
  '21.5': '21.5',
  '11.25': '11-11.5',
  '21': '21',
  '10.75': '10.5-11',
  '20.5': '20.5',
  '10.25': '10-10.5',
  '20': '20',
  '10': '10',
  '19.5': '19.5',
  '10.5': '10.5',
  '19': '19',
  '11': '11',
  '18.5': '18.5',
  '11.5': '11.5',
  '18': '18',
  '12': '12',
  '17.5': '17.5',
  '12.5': '12.5',
  '17': '17',
  '13': '13',
  '16.5': '16.5',
  '13.5': '13.5',
  '16': '16',
  '14': '14',
  '15.5': '15.5',
  '14.5': '14.5',
  '15': '15',
  '5': '5',
  '4.5': '4.5',
  '5.5': '5.5',
  '4': '4',
  '6': '6',
  '3.5': '3.5',
  '6.5': '6.5',
  '3': '3',
  '7': '7',
  '2.5': '2.5',
  '7.5': '7.5',
  '2': '2',
  '8': '8',
  '1.5': '1.5',
  '8.5': '8.5',
  '1': '1',
  '9': '9',
  '0.5': '0.5',
  '9.5': '9.5',
  '0': '0',
  '9.75': '9.5-10',
  '0.25': '0-0.5',
  '9.25': '9-9.5',
  '0.75': '0.5-1',
  '8.75': '8.5-9',
  '1.25': '1-1.5',
  '8.25': '8-8.5',
  '1.75': '1.5-2',
  '7.75': '7.5-8',
  '2.25': '2-2.5',
  '7.25': '7-7.5',
  '2.75': '2.5-3',
  '6.75': '6.5-7',
  '3.25': '3-3.5',
  '6.25': '6-6.5',
  '3.75': '3.5-4',
  '5.75': '5.5-6',
  '4.25': '4-4.5',
  '5.25': '5-5.5',
  '4.75': '4.5-5'
}

export const ROW_SIZE = 3

export const GAME_TYPES = {
  EARLY: 'Early',
  TODAY: 'Today',
  RUNNING: 'Running',
  NONE: 'None'
}

export const SPREAD = 'SPREAD'
export const TOTAL = 'TOTAL'
export const OVER = 'Over'
export const UNDER = 'Under'

export const FT = 0
export const FH = 1

export const HDP_FT = 1
export const HDP_FH = 7
export const OU_FT = 3
export const OU_FH = 1

export const newDataTableEmpty = {
  id: 9999,

  isBetAllowed: false,
  betRejectionReason: '',

  checkOdd: 0,
  oddFrom: '',
  oddTo: '',

  checkContra: 0,

  HDP: '',
  altLineId: 0,
  marketSelectionId_home_over: 0,
  marketSelectionId_away_under: 0,
  type_away_under: 0,
  type_home_over: 0,
  away: '',
  away_under: 0,
  bet: '',
  betAmount_Standard: '',
  betType: 0,
  company: '',
  coverage: '',
  gameType: '',
  hdp_point: 0,
  home: '',
  home_over: 0,
  idAccount: uuidv4(),
  idEvent: 0,
  idLeague: 0,
  info: '',
  league: '',
  nameAway: '',
  nameHome: '',
  nameLeague: '',

  score: '',
  stat: '',
  type: '',

  targetType: TARGET_TYPE.SET,
  odd: 0,
  platform: '',
  profit: 0,
  receiptID: '',
  receiptStatus: '',
  specialOdd: 0,
  time: '',
  typeOdd: '',

  submatch_id: 0,
  isHomeStrong: 0,
  uuidLeague: ''
}

export const LIMIT_METHOD = {
  TEAM_NAME: 'TeamName',
  TEAM_NAME_HANDICAP: 'TeamNameHandicap',
  NAME_BETTYPE_LIMIT: 'NameBetTypeLimit',
  NAME_TARGET_LIMIT: 'NameTargetLimit'
} as const

export const LIMIT_TYPE = {
  TOTAL_AMOUNT: 'TotalAmount',
  TOTAL_COUNT: 'TotalCount'
} as const

export const getThemeClass = (mode: 'bg' | 'text' | 'hover' = 'bg') => {
  if (mode === 'bg') {
    return 'bg-[#14B800]'
  } else if (mode === 'hover') {
    return 'hover:bg-[#115C0B]'
  } else {
    return 'text-[#1EE600]'
  }
}
