/* eslint-disable no-constant-condition */
import { setTimeout } from 'timers/promises'
import { parentPort } from 'worker_threads'

import { Account, clearTable, createModel, Setting } from '@db/model'
import dataCrawlByPlatformSchema from '@db/schema/dataCrawlByPlatform'
import { SettingSchemaType } from '@db/schema/setting'

import { GAME_TYPES } from '@shared/common/constants'
import { AccountType, NameTeamType } from '@shared/common/types'
import { STATUS_ACCOUNT, STATUS_LOGIN } from '@shared/main/constants'

import { accountLogToFile } from '@/worker/lib/accountLogToFile'
import { isAccountActive } from '@/worker/lib/checkAccount'
import { checkGameType } from '@/worker/lib/checkGameType'
import { logAndNotify, logCrawlError } from '@/worker/lib/exitAccountWithLog'
import { findActiveAccount } from '@/worker/lib/findActiveAccount'
import { findStandardTeam } from '@/worker/lib/findStandardTeam'
import { insertRecords } from '@/worker/lib/insertRecords'
import { systemLogToFile } from '@/worker/lib/systemLogToFile'
import { getMatchesFishBet88 } from '@/worker/platform/FishBet88/actions/getData'
import { keepAliveFishBet88 } from '@/worker/platform/FishBet88/actions/keepAlive'
import { getLobbySessionFishBet88 } from '@/worker/platform/FishBet88/actions/lobbySession'
import {
  MARKET_ID_FISHBET88,
  SPORT_ID_TENNIS_FISHBET88
} from '@/worker/platform/FishBet88/common/constants'
import { OddsRow_FishBet88 } from '@/worker/platform/FishBet88/common/types'
import {
  buildLiveStat,
  buildProxyAgent,
  euroToMalayOdds,
  mapOddsRowToRecords,
  parseKickOff,
  parseLeagueTarget,
  ProxyAgent_FishBet88,
  toStepEuroOdds,
  toStepRealOdds
} from '@/worker/platform/FishBet88/helper'
import { PLATFORM } from '@/worker/platform/platform.config'

const port = parentPort
if (!port) throw new Error('IllegalState')

/** The website polls GetBalance every 10s; keep doing it so the session stays alive. */
const KEEP_ALIVE_INTERVAL_MS = 10_000
const CRAWL_INTERVAL_MS = 5_000
const STRICT_MATCH = { orderID: 1, platformName: PLATFORM.FISHBET88 }

port.on('message', async (action: string) => {
  if (action == 'Start') {
    try {
      await handleCrawlData()
    } catch (error) {
      await systemLogToFile(`Error Handle Crawl Data FishBet88: ${JSON.stringify(error)}`, 'Error')
    }
  }
})

const handleCrawlData = async () => {
  while (true) {
    const account = Account.findOne({
      platformName: PLATFORM.FISHBET88,
      status: STATUS_ACCOUNT.LOGOUT,
      statusLogin: STATUS_LOGIN.SUCCESS,
      orderID: 1
    }) as AccountType

    if (!account) {
      await setTimeout(2000)
      continue
    }

    await fnCrawlData(account)
    await setTimeout(CRAWL_INTERVAL_MS)
  }
}

let lastKeepAliveAt = 0

/** Calls GetBalance at most once per KEEP_ALIVE_INTERVAL_MS. Returns false if the session is unusable. */
const keepAlive = async (account: AccountType, force = false) => {
  if (!force && Date.now() - lastKeepAliveAt < KEEP_ALIVE_INTERVAL_MS) return true

  lastKeepAliveAt = Date.now()
  return keepAliveFishBet88(port, account, isAccountActive)
}

const notifyProgress = (account: AccountType, message: string) =>
  logAndNotify(port, account, message, { strictMatch: STRICT_MATCH })

const notifyCrawlDone = () => {
  port.postMessage({ type: 'CrawlDone', platformName: PLATFORM.FISHBET88 })
}

const logProgram = (account: AccountType, message: string) =>
  accountLogToFile(account.platformName, account.loginID, message, 'Program')

/** Last message written to the log file per account, so a repeated message isn't logged every cycle. */
const lastLoggedMessage = new Map<number | string, string>()

const finishWithMessage = async (account: AccountType, message: string) => {
  if (lastLoggedMessage.get(account.id) !== message) {
    lastLoggedMessage.set(account.id, message)
    await logProgram(account, message)
  }
  await notifyProgress(account, message)
  clearTable(PLATFORM.FISHBET88)
  notifyCrawlDone()
}

const fnCrawlData = async (account: AccountType) => {
  const settings = Setting.findAll() as SettingSchemaType[]
  if (!settings.length) return

  const gameType = settings[0].gameType
  if (!gameType || gameType === GAME_TYPES.NONE) {
    await keepAlive(account)
    return
  }

  const accountInfo = findActiveAccount(account.id)
  if (!accountInfo) return

  if (accountInfo.typeCrawl !== gameType) {
    await logProgram(account, 'GameType changed, refresh to sync.')
    await logAndNotify(port, account, 'GameType changed, check box refresh to sync.', {
      fields: { status: STATUS_ACCOUNT.EXIT }
    })
    clearTable(PLATFORM.FISHBET88)
    return
  }

  if (!(await keepAlive(account, true))) return

  const marketId = MARKET_ID_FISHBET88[gameType]
  if (marketId === undefined) {
    await finishWithMessage(account, `Tennis ${gameType}: GameType not supported.`)
    return
  }

  const proxyAgent = buildProxyAgent(account)

  try {
    await notifyProgress(account, `Get Tennis ${gameType}...`)

    const isRunning = gameType === GAME_TYPES.RUNNING
    const [rows, stepOddsCal] = await Promise.all([
      getMatchesFishBet88(account, marketId, proxyAgent),
      isRunning ? 0 : getStepOddsCal(account, proxyAgent)
    ])

    await handleData(account, gameType, rows, stepOddsCal)
  } catch (error) {
    await logCrawlError(port, account, error, 'Crawl Data FishBet88', {
      clearTablePlatform: PLATFORM.FISHBET88
    })
  }
}

/**
 * `SSportStepOddsCal` of the lobby page, needed to show the odds a STEP bet (Today / Early) really gets.
 * The lobby session is cached per access token, so the lobby is opened once per login, not every cycle.
 * Falls back to 0 (and retries next cycle) when the lobby cannot be opened.
 */
const getStepOddsCal = async (account: AccountType, proxyAgent: ProxyAgent_FishBet88) => {
  try {
    const session = await getLobbySessionFishBet88(account, proxyAgent)
    return session.stepOddsCal
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await logProgram(account, `Open lobby for SSportStepOddsCal failed: ${message}`)
    return 0
  }
}

/**
 * Feed Malay odds -> Malay odds shown in the crawl, same as getTicket answers them:
 * - Running (single bet): the feed odds.
 * - Today / Early (STEP page): lobby real odds (feed - 0.01), to decimal + SSportStepOddsCal, back to Malay.
 */
const buildOddConverter = (isRunning: boolean, stepOddsCal: number) => (malay: number) =>
  isRunning ? malay : euroToMalayOdds(Number(toStepEuroOdds(toStepRealOdds(malay), stepOddsCal)))

const handleData = async (
  account: AccountType,
  gameType: string,
  rows: OddsRow_FishBet88[],
  stepOddsCal: number
) => {
  clearTable(PLATFORM.FISHBET88)

  const tennisRows = rows.filter((row) => row.SportID === SPORT_ID_TENNIS_FISHBET88)
  if (!tennisRows.length) {
    await finishWithMessage(account, `Tennis ${gameType}: No data.`)
    return
  }

  const FishBet88 = createModel(PLATFORM.FISHBET88, dataCrawlByPlatformSchema)
  const isRunning = gameType === GAME_TYPES.RUNNING
  const convertOdd = buildOddConverter(isRunning, stepOddsCal)
  const timeStart = Date.now()
  const records: Record<string, unknown>[] = []

  for (const row of tennisRows) {
    if (!isAccountActive(account.id)) return
    if (!checkGameType(account.platformName, gameType)) {
      await notifyProgress(account, 'GameType changed during crawl, stop processing.')
      return
    }

    const { league, targetType } = parseLeagueTarget(row.LeagueName ?? '')
    if (!targetType) continue

    const nameLeague = (row.LeagueName ?? '').trim()
    const nameHome = (row.HomeTeamName ?? '').trim()
    const nameAway = (row.AwayTeamName ?? '').trim()
    if (!nameHome || !nameAway) continue

    const standardHomeName = findStandardTeam({
      nameTeam: nameHome,
      nameLeague: league,
      platform: PLATFORM.FISHBET88
    }) as NameTeamType

    const standardAwayName = findStandardTeam({
      nameTeam: nameAway,
      nameLeague: league,
      platform: PLATFORM.FISHBET88
    }) as NameTeamType

    const { date, time } = parseKickOff(row.KickOffDateTime)

    const base = {
      gameType,
      date,
      time,
      platform: PLATFORM.FISHBET88,
      idLeague: row.LeagueID,
      nameLeague,
      idEvent: row.MatchID,
      nameHome,
      nameAway,
      isHomeStrong: Number(row.FTFav === 1),
      score: isRunning ? `${row.HomeScore ?? 0}-${row.AwayScore ?? 0}` : null,
      stat: isRunning ? buildLiveStat(row) : null,
      league: (standardHomeName?.league ?? league).toLocaleUpperCase(),
      home: (standardHomeName?.team ?? nameHome).toLocaleUpperCase(),
      away: (standardAwayName?.team ?? nameAway).toLocaleUpperCase()
    }

    records.push(...mapOddsRowToRecords(row, base, targetType, convertOdd))
  }

  const recordCount = records.length
  insertRecords(records, FishBet88)
  notifyCrawlDone()

  await notifyProgress(
    account,
    `Tennis ${gameType}: ${tennisRows.length} rows, ${recordCount} odds (${Date.now() - timeStart}ms)`
  )
}
