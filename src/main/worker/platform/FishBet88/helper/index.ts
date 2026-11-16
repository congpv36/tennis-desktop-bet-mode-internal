import { HttpsProxyAgent } from 'https-proxy-agent'

import { TARGET_TYPE } from '@shared/common/constants'
import { AccountType } from '@shared/common/types'
import { OPTIONS_PROXY } from '@shared/main/constants'

import { convertHdpPoint } from '@/worker/lib/convertHdpPoint'
import { isProxyConfigValid } from '@/worker/lib/isProxyConfigValid'
import {
  API_HOST_FISHBET88,
  LOBBY_ORIGIN_FISHBET88,
  ODDS_HOST_FISHBET88,
  ODDS_LINES_FISHBET88,
  SPORT_ID_TENNIS_FISHBET88,
  STEP_FEED_ODDS_DIFF_FISHBET88
} from '@/worker/platform/FishBet88/common/constants'
import { OddsRow_FishBet88, PlaceBetInfo_FishBet88 } from '@/worker/platform/FishBet88/common/types'

export function buildApiUrl(type: 'LOGIN_MODEL' | 'LOGIN' | 'BALANCE'): string
export function buildApiUrl(type: 'CAPTCHA', captchaToken: string): string
export function buildApiUrl(type: string, captchaToken?: string) {
  const urlMap: Record<string, string> = {
    LOGIN_MODEL: `${API_HOST_FISHBET88}/api/auth/player/getloginmodel?v=${Math.random()}`,
    CAPTCHA: `${API_HOST_FISHBET88}/captcha?token=${captchaToken}&v=${Math.random()}`,
    LOGIN: `${API_HOST_FISHBET88}/api/auth/player/login`,
    BALANCE: `${API_HOST_FISHBET88}/api/play/GetBalance`
  }

  return urlMap[type]
}

export function buildProxyAgent(account: AccountType) {
  const { status, data } = isProxyConfigValid(account)
  const { newIpAddress, newPort, newUsername, newPassword } = data

  const proxyUrl =
    status && account.proxyScope !== OPTIONS_PROXY.NONE
      ? `http://${newUsername}:${newPassword}@${newIpAddress}:${newPort}`
      : undefined

  return proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined
}

export type ProxyAgent_FishBet88 = ReturnType<typeof buildProxyAgent>

// The server reports a wrong captcha only through its message text; the exact wording is not
// documented, so match the common variants. Raw responses are logged to tune this if needed.
export function isCaptchaErrorMessage(message?: string | null) {
  return /captcha|verif(y|ication)\s*code|validation\s*code|security\s*code/i.test(message ?? '')
}

/**
 * API 1: odds rows of Tennis for one market (single-bet feed GetOtherSportOdds, Malay odds),
 * optionally filtered on one match (`matches=<MatchID>`, used by getTicket).
 * Running rows come back in `RunningMatches`, Today / Early rows in `Matches`.
 *
 * The parlay feed of the lobby (GetOtherSportMixOdds) has the same rows (same RowID / lines) but in
 * decimal odds rounded to 2 decimals, already lowered by STEP_FEED_ODDS_DIFF_FISHBET88; the Malay feed
 * is more precise. GetNewMoreBetOdds answers an empty body for Tennis.
 */
export function buildMatchesUrl(marketId: number, matchId?: number | string) {
  const params = new URLSearchParams({
    _: String(Date.now()),
    uid: '',
    sportID: String(SPORT_ID_TENNIS_FISHBET88),
    sortbyTime: 'false',
    leagues: '',
    matches: matchId ? String(matchId) : '',
    dateAdd: '',
    oddsGroup: 'A',
    marketID: String(marketId),
    fixDate: 'true',
    lang: 'en-us'
  })
  return `${ODDS_HOST_FISHBET88}/odds/GetOtherSportOdds?${params}`
}

/**
 * Tennis markets are separate "leagues": `ATP X` = match handicap (sets) / total,
 * `ATP X (Game Handicap)`, `ATP X (First Set Winner)`, `ATP X (Second Set Winner)`.
 * Only the match (sets) and Game Handicap leagues are crawled; `targetType` is empty for any other
 * suffix (e.g. the Set Winner leagues), so those rows are skipped.
 */
export function parseLeagueTarget(leagueName: string) {
  const trimmed = leagueName.trim()
  const match = /^(.*?)(?:\s*\(([^)]+)\))?$/.exec(trimmed)
  const league = (match?.[1] ?? trimmed).trim()
  const suffix = (match?.[2] ?? '').trim().toUpperCase()

  const targetBySuffix: Record<string, string> = {
    '': TARGET_TYPE.SET,
    'GAME HANDICAP': TARGET_TYPE.GAME
  }

  return { league, targetType: targetBySuffix[suffix] ?? '' }
}

/** `/Date(1794283200000)/` -> `{ date: 'MM/DD', time: 'HH:mm' }` in local time. */
export function parseKickOff(value: string) {
  const ms = Number(/-?\d+/.exec(value ?? '')?.[0])
  if (!Number.isFinite(ms)) return { date: '', time: '' }

  const kickOff = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${pad(kickOff.getMonth() + 1)}/${pad(kickOff.getDate())}`,
    time: `${pad(kickOff.getHours())}:${pad(kickOff.getMinutes())}`
  }
}

/** Live state shown in `stat` for tennis: `Set 2` when the feed gives the current set, else `LIVE`. */
export function buildLiveStat(row: OddsRow_FishBet88) {
  const set = Number(String(row.MatchTimeHalf ?? '').trim())
  return Number.isInteger(set) && set > 0 ? `Set ${set}` : 'LIVE'
}

const isValidOdd = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value !== 0

/**
 * Turns one odds row (Malay odds of GetOtherSportOdds) into records:
 * full match handicap and total of the tennis market `targetType`.
 * `hdp_point` follows the home side: negative when home gives the handicap.
 */
export function mapOddsRowToRecords(
  row: OddsRow_FishBet88,
  base: Record<string, unknown>,
  targetType: string,
  convertOdd: (malay: number) => number = (malay) => malay
) {
  const records: Record<string, unknown>[] = []

  for (const line of ODDS_LINES_FISHBET88) {
    const point = row[line.point]
    const homeOver = row[line.home]
    const awayUnder = row[line.away]
    if (typeof point !== 'number' || !isValidOdd(homeOver) || !isValidOdd(awayUnder)) continue

    const isHomeFav = 'fav' in line && row[line.fav] === 1
    const hdpPoint = isHomeFav && point !== 0 ? -point : point

    records.push({
      ...base,
      targetType,
      type: line.type,
      typeOdd: line.typeOdd,
      isHomeStrong: 'fav' in line ? Number(isHomeFav) : base.isHomeStrong,
      altLineId: Number(row.RowID),
      hdp_point: hdpPoint,
      HDP: convertHdpPoint(hdpPoint),
      home_over: convertOdd(homeOver),
      away_under: convertOdd(awayUnder)
    })
  }

  return records
}

/** URL of a lobby `/Bet/*` call. `_` is the jQuery cache buster the page adds to every XHR. */
export function buildLobbyBetUrl(
  path: 'GetPlaceBetInfo2' | 'PlaceBetfredBet' | 'PlaceBet',
  params: Record<string, string>
) {
  const query = new URLSearchParams({ ...params, _: String(Date.now()) })
  return `${LOBBY_ORIGIN_FISHBET88}/Bet/${path}?${query}`
}

/**
 * True when the lobby session is no longer valid:
 * - bounced to the logout page (3xx -> /logout), or
 * - 401 / 403 "Access is denied": the authToken was killed because another worker (e.g. the crawl,
 *   which opens the lobby for SSportStepOddsCal) called play/login and got a newer token.
 */
export function isLobbyLoggedOut(res: {
  status: number
  headers: { get(name: string): string | null }
}) {
  if (res.status === 401 || res.status === 403) return true
  return res.status >= 300 && res.status < 400 && /logout/i.test(res.headers.get('location') ?? '')
}

/**
 * Malay odds (feed) -> decimal odds (what the lobby bets with, `oddsCat=EU`).
 * 0.81 -> 1.81, -0.95 -> 2.05.
 */
export function malayToEuroOdds(malay: number) {
  const euro = malay > 0 ? 1 + malay : 1 + 1 / Math.abs(malay)
  return Math.round(euro * 100) / 100
}

/**
 * Parses `701|0.83|51922221|0.50||||2|2|250.00000000|0|500|1.0000|1000||False|`.
 * Min / max match the bet slip ("MIN - MAX 1 - 1000"): parts[12] = 1.0000, parts[13] = 1000.
 */
export function parsePlaceBetInfo(raw: string): PlaceBetInfo_FishBet88 {
  const parts = raw.trim().split('|')
  return {
    raw,
    parts,
    code: parts[0] ?? '',
    odds: Number(parts[1]),
    rowId: parts[2] ?? '',
    handicap: parts[3] ?? '',
    maxBet: Number(parts[13]),
    minBet: Number(parts[12])
  }
}

/**
 * Odds a STEP bet is placed with, same as the lobby ($ConvertOdds(realOdds, EU) in Betfred_common.js):
 * Malay `realOdds` (GetPlaceBetInfo2 parts[1]) -> decimal, plus `SSportStepOddsCal`, cut to 3 decimals,
 * then shown / sent with 2 decimals. 0.83 + (-0.02) -> "1.81", -0.810 -> "2.21".
 */
export function toStepEuroOdds(realOdds: number, stepOddsCal: number) {
  const hk = realOdds >= 0 ? realOdds : Math.floor((1 / Math.abs(realOdds)) * 100) / 100
  const euro = realOdds <= 1 && realOdds !== 0 ? hk + 1 : realOdds
  const withCal = euro + stepOddsCal
  const floored = Math.trunc(withCal * 1000) / 1000
  return floored.toFixed(2)
}

/** Messages of the lobby status codes (Betfred_bet.js -> confirmPlaceBet). */
export const LOBBY_STATUS_MESSAGES_FISHBET88: Record<string, string> = {
  '700': 'User status error',
  '701': 'ODDS_CHANGE',
  '702': 'Insufficient balance',
  '703': 'Score changed',
  '704': 'Max per match exceeded',
  '705': 'Lower than member min bet',
  '706': 'Higher than member max bet',
  '707': 'Invalid odds',
  '708': 'Lower than member min bet',
  '709': 'Higher than member max bet',
  '710': 'Temp odds close',
  '711': 'Account suspended',
  '712': 'Unknown match info',
  '716': 'Failed to get balance',
  '717': 'Odds closed',
  '718': 'Odds closed',
  '719': 'Odds closed',
  '789': 'Odds closed'
}

/**
 * Malay odds of the feed -> Malay odds that can really be bet on a STEP page
 * (decimal + SSportStepOddsCal, see toStepEuroOdds). 0.85 -> 0.83 with -0.02.
 */
export function toStepMalayOdds(malay: number, stepOddsCal: number) {
  if (!stepOddsCal) return malay
  return euroToMalayOdds(Number(toStepEuroOdds(malay, stepOddsCal)))
}

/**
 * Feed Malay odds -> real Malay odds the lobby answers on a STEP page (feed + STEP_FEED_ODDS_DIFF_FISHBET88).
 * Malay -1.00 and 1.00 are the same price, so going below -1 wraps to the positive side: -1.00 -> 0.99.
 */
export function toStepRealOdds(feedMalay: number) {
  let real = Math.round((feedMalay + STEP_FEED_ODDS_DIFF_FISHBET88) * 100) / 100
  if (real < -1) real = Math.round((real + 2) * 100) / 100
  return real
}

/** Decimal odds -> Malay odds (unit of the crawl / ticket.odd). 1.85 -> 0.85, 2.05 -> -0.95. */
export function euroToMalayOdds(euro: number) {
  const malay = euro >= 2 ? -1 / (euro - 1) : euro - 1
  return Math.round(malay * 100) / 100
}

/**
 * GetPlaceBetInfo2 and a rejected PlaceBetfredBet both answer `701|<odds>|<rowId>|...`;
 * a successful PlaceBetfredBet answers JSON.
 */
export function isPlaceBetInfoResponse(raw: string) {
  return /^\s*\d+\|[^|]*\|\d+\|/.test(raw)
}
