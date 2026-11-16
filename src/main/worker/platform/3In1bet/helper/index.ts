import { TARGET_TYPE } from '@shared/common/constants'
import { AccountType } from '@shared/common/types'

export function buildPlatformUrl_3In1Bet(account: AccountType, type?: string) {
  const url = account.loginURL

  if (!type) return url

  const urlMap = {
    CHECK: `${url}check.aspx`,
    PROCESSLOGIN: `${url}main/processlogin.aspx`,
    MAIN_TOP_HEADER: `${url}main/topheader.aspx?lan=en-US`,
    USER_INFO_PANEL_HOST: `${url}member/betsview/UserInfoPanelHost.aspx?Ajax=1`,
    DATA_ODDS: `${url}Member/BetsView/BetLight/DataOdds.ashx`,
    SET_DATA: `${url}member/betsview/Bet.asmx/SetData`,
    BET_NOW: `${url}member/betsview/Bet.asmx/BetNow`,
    AR: `${url}member/betsview/data.asmx/sports/order/unify`
  }

  return urlMap[type] ?? url
}

export function buildHdpDoubleUrl(type: string, API_BASE_URL: string): string {
  return `${API_BASE_URL}Member/BetOdds/HdpDouble.aspx?v=1&m1=${type}&sports=S_&isHighlight=false`
}

export function createPayload(gameType) {
  const fcMap = {
    Early: '6',
    Running: '4',
    Today: '1'
  }

  return {
    SingleDouble: 'double',
    SystemLanguage: 'en-US',
    TimeFilter: '0',
    c: 'A',
    clientTime: '',
    exlist: '0',
    fav: '',
    fc: fcMap[gameType],
    keywords: '',
    m_LeagueList: '',
    m_SortByTime: '0',
    m_accType: 'MY+MR',
    m_gameType: 'TN_',
    m_sp: '0'
  }
}

export function isArError(res: unknown): res is { Au: number } {
  return typeof res === 'object' && res !== null && 'Au' in res
}

export function parseLeagueType(nameLeague: string) {
  const typeMap = {
    'FIRST SET WINNER': TARGET_TYPE.FIRST_SET,
    'GAME HANDICAP': TARGET_TYPE.GAME,
    'SECOND SET WINNER': TARGET_TYPE.SECOND_SET
  }

  const match = nameLeague.match(/\((.*?)\)$/)
  const type = match ? typeMap[match[1].trim()] || TARGET_TYPE.SET : TARGET_TYPE.SET

  const league = nameLeague.replace(/\s*\(.*?\)$/, '').trim()

  return { league, type }
}

export function removeCountryTag(name) {
  if (!name) return ''

  if (name.includes('/')) {
    return name
      .split('/')
      .map((n) => n.replace(/\s*\([^)]*\)\s*$/, '').trim())
      .join('/')
      .toUpperCase()
  }

  return name
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toUpperCase()
}

export function removeBracketContent(text) {
  return text.replace(/\s*\([^)]*\)/g, '').trim()
}
