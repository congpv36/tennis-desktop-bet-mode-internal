type Range<N extends number, A extends number[] = []> = A['length'] extends N
  ? A[number]
  : Range<N, [...A, A['length']]>

type AllSuffixes = '' | '_25' | '_5' | '_75'

type HdpKey<N extends number, LastSuffixes extends string = '_25' | '_5' | '_75'> =
  | `${`hdp_${Range<N>}`}${AllSuffixes}`
  | `${`hdp_${N}`}${'' | LastSuffixes}`

type BaseBetToType<N extends number, LastSuffixes extends string = '_25' | '_5' | '_75'> = Record<
  HdpKey<N, LastSuffixes> | 'betAll' | 'selectAll',
  number
>
export type SET_FT_HDP_BetToType = BaseBetToType<2, '_25' | '_5'>
export type SET_1ST_GAME_OU_BetToType = BaseBetToType<13, never>
export type GAME_FT_HDP_BetToType = BaseBetToType<18, never>
export type GAME_FT_OU_BetToType = BaseBetToType<65, never>

export interface LineRangeData {
  betOnAllTypes: boolean
  betOnSelectedTypes: boolean
  gameTypes: {
    today: boolean
    early: boolean
    running: boolean
  }
  checkOdds: boolean
  oddsFrom: number
  oddsTo: number
}

export type LeaguePointRandomizerType = {
  id: string
  league: string
  checked: number
  fromValue: string
  toValue: string
}

export type PlatformUrlType = {
  id: string
  url: string
  platformName: string
}

export interface RangeType {
  betAll: number
  today: number
  early: number
  running: number
  checkOdd: number
  oddFrom: string
  oddTo: string
}

interface DetailRangeType {
  range: RangeType
}

export interface AmountRounderSettingType {
  rounder: number
  roundType: string
  roundValue: string
}

export interface SET_FT_HDP_DetailFullType {
  betTo: SET_FT_HDP_BetToType
  range: RangeType
}

export interface SET_1ST_GAME_OU_DetailFullType {
  betTo: SET_1ST_GAME_OU_BetToType
  range: RangeType
}

interface GAME_FT_HDP_DetailFullType {
  betTo: GAME_FT_HDP_BetToType
  range: RangeType
}

interface GAME_FT_OU_DetailFullType {
  betTo: GAME_FT_OU_BetToType
  range: RangeType
}

export interface SportBookSettingType {
  id: number
  name: string

  checkOdd: number
  oddFrom: string
  oddTo: string
  betOpposite: number

  amountRounderSetting: AmountRounderSettingType

  generalSetting: string

  SET_FT_HDP_PK: number
  SET_FT_HDP_PUT: number
  SET_FT_HDP_EAT: number
  SET_1ST_GAME_OVER: number
  SET_1ST_GAME_UNDER: number

  GAME_FT_HDP_PK: number
  GAME_FT_HDP_PUT: number
  GAME_FT_HDP_EAT: number
  GAME_FT_OVER: number
  GAME_FT_UNDER: number

  SET_FT_HDP_PK_Detail: DetailRangeType
  SET_FT_HDP_PUT_Detail: SET_FT_HDP_DetailFullType
  SET_FT_HDP_EAT_Detail: SET_FT_HDP_DetailFullType
  SET_1ST_GAME_OVER_Detail: SET_1ST_GAME_OU_DetailFullType
  SET_1ST_GAME_UNDER_Detail: SET_1ST_GAME_OU_DetailFullType

  GAME_FT_HDP_PK_Detail: DetailRangeType
  GAME_FT_HDP_PUT_Detail: GAME_FT_HDP_DetailFullType
  GAME_FT_HDP_EAT_Detail: GAME_FT_HDP_DetailFullType
  GAME_FT_OVER_Detail: GAME_FT_OU_DetailFullType
  GAME_FT_UNDER_Detail: GAME_FT_OU_DetailFullType
}

export interface PlatformPairType {
  id: string
  isValid: number
  key: string
  sportBook1: SportBookSettingType
  sportBook2: SportBookSettingType
}

export type ListRangePlatformType = {
  id: number
  platform: string
  valueRange: number
}

export type OtherSettingType = {
  id: number
  isOther: number
  isBetUnderSelected: number
  isBetOverSelected: number
  isBetPutSelected: number
  isBetEatSelected: number
}

export type SettingTableViewType = {
  id: number
  tab: string
  contraStrategy: string
  clear: number
  scroll: number
}

export type TicketInfoDataBetType = {
  id: number

  isBetAllowed: boolean
  betRejectionReason: string

  checkOdd: number
  oddFrom: string
  oddTo: string

  HDP: string
  submatch_id: number | null
  altLineId: number
  marketSelectionId_home_over: number | null
  marketSelectionId_away_under: number | null

  type_away_under: number
  type_home_over: number

  away: string | null
  away_under: number
  bet: string
  betAmount_Standard: string
  betType: number
  company: string
  coverage: string
  gameType: string
  hdp_point: number
  home: string | null
  home_over: number
  idAccount: string
  idEvent: number
  isHomeStrong: number | null
  idLeague: number
  uuidLeague: string | null
  info: string | null
  league: string | null
  nameAway: string
  nameHome: string
  nameLeague: string

  score: string
  stat: string
  type: string

  targetType: string
  odd: number
  platform: string
  profit: number
  receiptID: string | null
  receiptStatus: string
  specialOdd: number | null
  time: string
  typeOdd: string
}

export type BetListDBType = {
  id: number
  dataPair: string
}

export type WaitingSuccessContraDBType = {
  id: number
  uuid: string
  dataPair: string
}

export type PlatformType = {
  id: number
  uuid: string
  url: string
  name: string
}

export type AccountType = {
  id: string

  orderID: number
  winBetsCount: number
  autoLoginAttempts: number

  loginID: string
  password: string
  secret: string | null

  limitMethod: string
  livePreGame: number
  limitType: string
  totalAmount: string
  totalCount: string

  platformName: string
  loginURL: string

  currency: string
  cashBalance: string
  outstanding: string
  credit: string
  givenCredit: string

  textLog: string

  customIP: string
  proxyIP: string
  proxyPort: string
  proxyUsername: string
  proxyPassword: string
  proxyScope: string

  typeCrawl: string

  checkBoxBet: number
  checkBoxRefresh: number
  checkBoxAutoLogin: number
  checkBoxLockURL: number

  statusLogin: string | null
  statusPair: number
  status: string
  statusDelete: number

  cookie: string
  vHucode: string
  hdToken: string
  token: string

  host: string
  socketUrl: string
  parent_id: string | null
  uid: string
}

export type SwitchAccountType = AccountType & {
  delayLoginSec: number
}

export interface DataPlatformType extends SportsBookType {
  accounts: AccountType[]
}

export type SportsBookType = {
  id: string
  name: string
  platform: string
  url: string
  isPaired: number

  betAmountSetting: string
  betFixedAmountValue: string

  isSwitchBySuccessCount: number
  minSuccessCount: string
  maxSuccessCount: string

  isSwitchByCredit: number
  maxCredit: string

  isRandomDelayLogin: number
  minDelayLogin: string
  maxDelayLogin: string

  delayNormal: string
  delaySameGame: string
  suggestedClient: string
  delayLoginSec_from: string
  delayLoginSec_to: string
  VIPAccountLogout: number
  switchIntervalSetting_from: string
  switchIntervalSetting_to: string
  switchIntervalSettingMinutes: string
  hight_account: string
  accountType: string
  switchAccountSetting: string

  valueRange: number

  isMatchLimitAllAccount: number
  limitMethod: string
  limitType: string
  totalAmount: string
  totalCount: string

  lockURL: number
}

export type SettingType = {
  id: string
  profitMin: string
  profitMax: string
  gameType: string

  schedulerRunning: number
  schedulerInputRunning: string
  schedulerToday: number
  schedulerInputToday: string
  schedulerEarly: number
  schedulerInputEarly: string

  bettingMode: string
  amountRoundingEnabled: number
  roundType: string
  roundingNumber: string

  enablePerMatchLimitSetting: number

  ipAddress: string
  port: string
  username: string
  password: string

  oddsLessThan: number
  oddsMoreThan: number
  gameCommissionMoreThan: number
  gameCommissionLessThan: number

  oddsLessThanValue: string
  oddsMoreThanValue: string
  gameCommissionMoreThanValue: string
  gameCommissionLessThanValue: string

  enableRandomizer: number
  fromRandomizer: string
  toRandomizer: string

  isOther: number
  isBetUnderSelected: number
  isBetOverSelected: number
  isBetPutSelected: number
  isBetEatSelected: number

  isBetByOtherAcc: number

  settingTotalGoal: SettingTotalGoalType
  settingScoreList: SettingScoreListType

  betMode: string

  language: string
}

export type SettingTotalGoalType = {
  enable: number
  from: number
  to: number
}

export type ScoreListType = { home: string; away: string }

export type SettingScoreListType = {
  enable: number
  list: ScoreListType[]
}

export type SettingPerMatchLimitType = {
  id: number
  namePlatform: string
  limitMethod: string

  limitType: string
  totalAmount: string
  totalCount: string
}

export type SettingLeagueFilterType = {
  id: string
  filterType: string
  blockMajorLeague: number
  allowMajorLeague: number
}

export type DataCrawlType = {
  id: number

  gameType: string

  platform: string

  idLeague: number
  uuidLeague: string | null
  nameLeague: string

  idEvent: number
  isHomeStrong: number | null
  nameHome: string
  nameAway: string

  targetType: string

  date: string
  time: string
  score: string
  stat: string
  type: string

  submatch_id: number | null
  altLineId: number
  marketSelectionId_home_over: number | null
  marketSelectionId_away_under: number | null

  type_away_under: number
  type_home_over: number

  hdp_point: number
  home_over: number
  away_under: number
  typeOdd: string

  league: string | null
  home: string | null
  away: string | null

  specialOdd: number | null
  betType: number

  HDP: string
}

export interface GenerateTicketUpdateType extends DataCrawlType {
  bet: string
  betSub: string
  odd: number
  oddSub: number
  profit: number
  info: string | null
  betAmount_Standard: string
  company: string
  coverage: string
  gameType: string
  time: string
  receiptID: string | null
  receiptStatus: string
}

export interface TicketCombinationType extends GenerateTicketUpdateType {
  betOpposite: number
  isBetAllowed: boolean
  betRejectionReason: string
  checkOdd: number
  oddFrom: string
  oddTo: string
}

export interface TicketBetType extends TicketCombinationType {
  idAccount: string
}

export type DataPairPlatformType = {
  id: number

  platform: string

  idLeague: number
  nameLeague: string

  idEvent: number
  nameHome: string
  nameAway: string

  score: string
  stat: string
  type: string

  targetType: string
  submatch_id: number | null
  altLineId: number
  hdp_point: number
  home_over: number
  away_under: number
  typeOdd: string

  league: string | null
  home: string | null
  away: string | null

  specialOdd: number | null
  betType: number

  HDP: string

  bet: string
  odd: number
  profit: number
}

export type NameTeamType = {
  id: number
  nameTeam: string
  nameLeague: string
  platform: string
  idPlatform: number
  team: string
  league: string
}

export type NameLeagueType = {
  id: number
  nameLeague: string
  platform: string
  idPlatform: number
  league: string
}

export type DataBetType = {
  id?: number
  idPlatformPair: string
  dataPair: string
}

export type TableLeagueFilterType = {
  id: number
  league: string
}

export type SportsBook = {
  id: number
  name: string
  platform: string
  url: string
  delayNormal: string
  delaySameGame: string
  suggestedClient: string
  delayLoginSec_from: string
  delayLoginSec_to: string
  switchIntervalSetting_from: string
  switchIntervalSetting_to: string
  accountType: string
  switchAccountSetting: string
  switchIntervalSettingMinutes: string
  VIPAccountLogout: number
}

type UserData = {
  id: string
  username: string
  role: string
  appType: string
  isActive: boolean
  currentPoint: number
  expiredDate: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type ApiResponse = {
  message: string
  data: UserData
}

export type Announcement = {
  appType: string
  announcementType: string
  isEnable: boolean
  filePath: string
  content: string
}

export type LeagueType = {
  id: number
  nameLeague: string
  idLeague: string
  league: string
}

export type LoginLogoutSetting = {
  enabled: number
  schedules: {
    day: string
    time: string
  }[]
}

export type ScheduledLoginLogoutParseType = {
  id: string
  platformName: string
  checked: number
  loginSetting: LoginLogoutSetting
  logoutSetting: LoginLogoutSetting
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type GetTicketShowOdd = {
  code: number
  message: string
  odds: number
  oldsOdd: number
  min: number
  max: number
  ticket: TicketBetType
  response: any
}

export type PlaceTicketShowOdd = {
  code: number
  response: {
    info: string
    receiptID: string
    receiptStatus: string
  }
}

export type ShowOddsOddCell = {
  homeOdd: number
  line: string
  awayOdd: number
  hdp_point: number
  meta: DataCrawlType
}
export type ShowOddsHalfMarket = { hdp?: ShowOddsOddCell; ou?: ShowOddsOddCell }
export type ShowOddsMatchMarket = { hdp: ShowOddsOddCell; ou: ShowOddsOddCell }

export type ShowOddsMarketRow = {
  set: ShowOddsMatchMarket
  game?: ShowOddsHalfMarket
}
export type ShowOddsLeagueEntry = {
  league: string
  home: string
  away: string
  gameType: string
  date: string
  time: string
  score: string
  stat: string
  targetType: string
  markets: ShowOddsMarketRow[]
}
export type ShowOddsResult = { data: ShowOddsLeagueEntry[]; changedKeys: string[] }
