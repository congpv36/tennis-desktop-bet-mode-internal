import { v4 as uuidv4 } from 'uuid'

import { AccountType } from '@shared/common/types'

export const EMPTY_ACCOUNT: AccountType = {
  id: uuidv4(),

  orderID: 0,
  winBetsCount: 0,
  autoLoginAttempts: 0,

  loginID: '',
  password: '',
  secret: '',

  limitMethod: '',
  livePreGame: 0,
  limitType: '',
  totalAmount: '',
  totalCount: '',

  platformName: '',
  loginURL: '',

  currency: '',
  credit: '',
  cashBalance: '',
  outstanding: '',
  givenCredit: '',
  textLog: '',

  customIP: '',
  proxyIP: '',
  proxyPort: '',
  proxyUsername: '',
  proxyPassword: '',
  proxyScope: 'None',

  typeCrawl: '',

  checkBoxBet: 0,
  checkBoxRefresh: 0,
  checkBoxAutoLogin: 0,
  checkBoxLockURL: 0,

  statusLogin: null,
  statusPair: 0,
  status: '',
  statusDelete: 0,

  cookie: '',
  vHucode: '',
  hdToken: '',
  token: '',
  host: '',
  socketUrl: '',
  parent_id: null,
  uid: '',
  ltype: null
}

export const VALUE_DEFAULT_ODDS_SETTING = {
  oddsLessThanValue: '0.10',
  oddsMoreThanValue: '0.80',
  gameCommissionMoreThanValue: '0.24',
  gameCommissionLessThanValue: '0.08'
}

export const TEXT_MESSAGE_ERROR_DEFAULT = {
  oddsLessThanValue:
    '[Do Not Bet when Odds <] Setting Error - Value must be ranged from Malay Odds -0.99 ~ 0.99!',
  oddsMoreThanValue:
    '[Do Not Bet when Odds >] Setting Error - Value must be ranged from Malay Odds -0.99 ~ 0.99!',
  gameCommissionMoreThanValue:
    '[Do Not Bet when Game Commission >] Setting Error - Value must be ranged from Malay Odds -0.99 ~ 0.99!',
  gameCommissionLessThanValue:
    '[Do Not Bet when Game Commission <] Setting Error - Value must be ranged from Malay Odds -0.99 ~ 0.99!'
}

export const CHECK_BOX_DETAIL_SETTING = [
  { key: 'SET_FT_HDP_PK', label: 'FT SET HDP PK' },
  { key: 'SET_FT_HDP_PUT', label: 'FT SET HDP PUT' },
  { key: 'SET_FT_HDP_EAT', label: 'FT SET HDP EAT' },

  { key: 'SET_1ST_GAME_OVER', label: '1ST SET GAME OVER' },
  { key: 'SET_1ST_GAME_UNDER', label: '1ST SET GAME UNDER' },

  { key: 'GAME_FT_HDP_PK', label: 'FT GAME HDP PK' },
  { key: 'GAME_FT_HDP_PUT', label: 'FT GAME HDP PUT' },
  { key: 'GAME_FT_HDP_EAT', label: 'FT GAME HDP EAT' },

  { key: 'GAME_FT_OVER', label: 'FT GAME OVER' },
  { key: 'GAME_FT_UNDER', label: 'FT GAME UNDER' }
]

export const SPORTS_BOOK_LIST = [
  { id: 'sports-book1', label: 'SportsBook 1' },
  { id: 'sports-book2', label: 'SportsBook 2' },
  { id: 'sports-book3', label: 'SportsBook 3' },
  { id: 'sports-book4', label: 'SportsBook 4' },
  { id: 'sports-book5', label: 'SportsBook 5' }
]

export enum Language {
  EN = 'en',
  VI = 'vi',
  ZH = 'zh'
}

export type LanguageType = 'en' | 'zh' | 'vi'

export const DEFAULT_LANGUAGE = Language.EN

export const PROGRAM_SETTING_LIST = [
  { id: 'general-setting', label: 'general_settings' },
  { id: 'platform-pair', label: 'platform_pair' },
  { id: 'bet-setting', label: 'bet_settings' },
  { id: 'proxy-setting', label: 'proxy_server_settings_title' },
  { id: 'language', label: 'language' }
]
