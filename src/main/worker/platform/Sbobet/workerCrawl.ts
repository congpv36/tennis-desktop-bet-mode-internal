/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { setTimeout } from 'timers/promises'
import { parentPort } from 'worker_threads'

import Model, {
  Account,
  clearTable,
  createModel,
  EventSbobet,
  LeagueSbobet,
  NameLeague,
  Setting
} from '@db/model'
import dataCrawlByPlatformSchema from '@db/schema/dataCrawlByPlatform'
import { EventSbobetType } from '@db/schema/eventSbobet'
import { SettingSchemaType } from '@db/schema/setting'
import { HttpsProxyAgent } from 'https-proxy-agent'
import fetch from 'node-fetch'

import { CONVERT_HDP, GAME_TYPES } from '@shared/common/constants'
import { SPREAD, TOTAL } from '@shared/common/constants'
import {
  AccountType,
  DataCrawlType,
  LeagueType,
  NameLeagueType,
  NameTeamType
} from '@shared/common/types'
import { OPTIONS_PROXY, STATUS_ACCOUNT, STATUS_LOGIN } from '@shared/main/constants'

import { isAccountActive } from '@/worker/lib/checkAccount'
import { logAndNotify, logAndTriggerRelogin } from '@/worker/lib/exitAccountWithLog'
import { findStandardTeam } from '@/worker/lib/findStandardTeam'
import { isProxyConfigValid } from '@/worker/lib/isProxyConfigValid'
import { systemLogToFile } from '@/worker/lib/systemLogToFile'
import { toPositiveNumber } from '@/worker/lib/toPositiveNumber'
import { PLATFORM } from '@/worker/platform/platform.config'
import { getBalanceSbobet } from '@/worker/platform/Sbobet/actions/getBalance'
import { SBO_CONFIG, SBO_CONFIG_TYPE_ODD } from '@/worker/platform/Sbobet/common/constants'
import {
  checkCloudflare,
  formatPlayerName,
  getDataPreset,
  getMatchMinute,
  getTargetType,
  parseGraphQLResponse
} from '@/worker/platform/Sbobet/helper'

let gameType: string | null = null

interface Account {
  host: string
  cookie: string
}
const port = parentPort
if (!port) throw new Error('IllegalState')

port.on('message', async (action: string) => {
  if (action == 'Start') {
    try {
      await handleCrawlData()
    } catch (error) {
      await systemLogToFile(`Error Handle Crawl Data Sbobet: ${JSON.stringify(error)}`, 'Error')
    }
  }
})

const handleCrawlData = async () => {
  while (true) {
    const account = Account.findOne({
      platformName: PLATFORM.SBOBET,
      status: STATUS_ACCOUNT.LOGOUT,
      statusLogin: STATUS_LOGIN.SUCCESS,
      orderID: 1
    }) as AccountType

    if (!account) {
      await setTimeout(2000)
      continue
    }

    await fnCrawlData(account)
    await setTimeout(5000)
    clearTable('EventSbobet')
    clearTable('LeagueSbobet')
    clearTable(PLATFORM.SBOBET)
  }
}
const fnCrawlData = async (account: AccountType) => {
  const settings = Setting.findAll() as SettingSchemaType[]
  if (!settings.length) return

  gameType = settings[0].gameType
  if (!gameType || gameType === 'None') return

  await logAndNotify(port, account, `Data Scraping In Progress... (${gameType})`)

  const accountRefresh = Account.findOne({
    id: account.id,
    orderID: 1,
    status: STATUS_ACCOUNT.LOGOUT,
    statusLogin: STATUS_LOGIN.SUCCESS
  }) as AccountType
  if (!accountRefresh) return

  if (accountRefresh.typeCrawl !== gameType) {
    await logAndNotify(port, account, 'GameType changed, check box refresh to sync.', {
      fields: { status: STATUS_ACCOUNT.EXIT }
    })

    clearTable(PLATFORM.SBOBET)
    return
  }

  const { status, data } = isProxyConfigValid(account)
  const { newIpAddress, newPort, newUsername, newPassword } = data
  const proxyUrl =
    status && account.proxyScope !== OPTIONS_PROXY.NONE
      ? `http://${newUsername}:${newPassword}@${newIpAddress}:${newPort}`
      : undefined

  const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined

  const { ErrorCode, Message, credit, cashBalance, outstanding, givenCredit, currency } =
    (await getBalanceSbobet(account)) as any

  if (ErrorCode != 0) {
    await logAndTriggerRelogin(port, account, `Get balance failed: ${Message}`)

    return
  }
  await logAndNotify(port, account, `Balance updated: ${credit} ${currency}`, {
    fields: { credit, cashBalance, outstanding, givenCredit, currency }
  })

  try {
    const timeStart = new Date().getTime()
    await logAndNotify(port, account, `Get Tennis ${gameType}...`)

    const fetchTokenUrl = `${account.host}${SBO_CONFIG.FETCH_TOKEN}`
    const headersGetToken = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
      Connection: 'keep-alive',
      'Content-Length': '0',
      Referer: account.host,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      Cookie: account.cookie,
      ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
    }

    const resToken = await fetch(fetchTokenUrl, {
      method: 'GET',
      headers: headersGetToken,
      ...(proxyAgent && { agent: proxyAgent })
    })

    const tokenData = await resToken.json()
    const authToken = tokenData.authToken
    const oddsToken = tokenData.oddsToken

    const headers = {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
      authorization: authToken,
      'content-type': 'application/json',
      referer: account.host,
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
    }

    const DataPreset = getDataPreset(gameType)
    if (Object.keys(DataPreset).length === 0) return

    const variablesString = encodeURIComponent(
      JSON.stringify({
        query: {
          eventIds: [],
          filter: DataPreset,
          oddsCategory: 'All',
          sport: 'Tennis',
          timeZone: 'UTC__4',
          tournamentIds: [],
          tournamentNames: []
        }
      })
    )

    const fetchEventsQuery = `${new URL(SBO_CONFIG.FETCH_EVENT)}?operationName=EventsQuery&variables=${variablesString}&extensions=${encodeURIComponent(
      JSON.stringify({
        persistedQuery: {
          version: 1,
          sha256Hash: SBO_CONFIG.SHA256_HASH_EVENTS_QUERY
        }
      })
    )}`

    const fetchEventResultsQuery = `${new URL(SBO_CONFIG.FETCH_EVENT)}?operationName=EventResultsQuery&variables=${variablesString}&extensions=${encodeURIComponent(
      JSON.stringify({
        persistedQuery: {
          version: 1,
          sha256Hash: SBO_CONFIG.SHA256_HASH_EVENTS_RESULTS_QUERY
        }
      })
    )}`

    const fetchOptions = {
      method: 'GET',
      headers,
      ...(proxyAgent && { agent: proxyAgent })
    }

    const [resEventsQuery, resEventResultsQuery] = await Promise.all([
      fetch(fetchEventsQuery, fetchOptions),
      fetch(fetchEventResultsQuery, fetchOptions)
    ])

    await checkCloudflare(resEventsQuery, account)
    await checkCloudflare(resEventResultsQuery, account)

    const parsedEventsQuery = await parseGraphQLResponse(resEventsQuery, 'EventsQuery')

    if (parsedEventsQuery.error) throw parsedEventsQuery.error

    const dataSbobet = parsedEventsQuery
    const parsedEventResultsQuery = await parseGraphQLResponse(
      resEventResultsQuery,
      'EventResultsQuery'
    )
    if (parsedEventResultsQuery.error) throw parsedEventResultsQuery.error
    const dataSbobetEvent = parsedEventResultsQuery

    if (dataSbobet?.data?.events?.length === 0) return
    if (dataSbobetEvent?.data?.events?.length === 0) return

    const hasLeagueData = await handleDataLeague({ dataSbobet, account, headers, proxyAgent })
    if (hasLeagueData) {
      await handleDataSbobetOdds({ dataSbobetEvent, account, oddsToken, authToken, proxyAgent })
    }

    const settings = Setting.findAll() as SettingSchemaType[]
    if (gameType != settings[0].gameType) return

    port.postMessage({
      type: 'CrawlDone',
      platformName: PLATFORM.SBOBET
    })

    const timeEnd = new Date().getTime()
    await logAndNotify(port, account, `Handle Data Sbobet Done. (${timeEnd - timeStart}ms)`)
  } catch (error) {
    const errorMessage =
      'Unable to connect to the server. Please check your network connection or try again later.'
    const message = error instanceof Error ? error.message : errorMessage

    console.error('Error Crawl Data Sbobet:', message)

    await logAndTriggerRelogin(port, account, `[ERROR] Crawl Data Sbobet: ${message}`, {
      clearTablePlatform: PLATFORM.SBOBET
    })

    return
  }
}

const checkGameType = () => {
  const settingInfo = Setting.findAll()
  const currentGameType = settingInfo[0]?.gameType

  if (!currentGameType || gameType !== currentGameType) {
    clearTable('PerMatchLimit')
    clearTable(PLATFORM.SBOBET)
    return false
  }

  return true
}

const insertRecords = (records: any, Sbobet: Model) => {
  Sbobet.insertMany(records)
  records.length = 0
}

const handleDataLeague = async ({ dataSbobet, account, headers, proxyAgent }) => {
  await logAndNotify(port, account, `Start Handle Data League... (${gameType})`)

  const Sbobet = createModel('Sbobet', dataCrawlByPlatformSchema)
  const timeStart = new Date().getTime()
  const eventsLength = dataSbobet?.data?.events?.length

  if (!eventsLength) {
    await logAndNotify(port, account, `Tennis ${gameType}: No data.`, {
      strictMatch: { orderID: 1, platformName: PLATFORM.SBOBET }
    })

    return false
  }

  for (const event of dataSbobet.data.events) {
    if (!isAccountActive(account.id)) return false
    if (!checkGameType()) {
      await logAndNotify(port, account, 'GameType changed during crawl, stop processing.')
      return false
    }

    const tournament = event.tournament
    const tournamentId = tournament.id
    const tournamentName = String(tournament.tournamentName[0].value).trim()

    if (tournamentName.toLowerCase().includes('e-tennis')) continue

    const nameLeagueTarget = tournamentName.includes('(Set Handicap)')
      ? tournamentName.replace(/\s*\(Set Handicap\)\s*/i, '').trim()
      : tournamentName

    let leagueSbobetData = LeagueSbobet.findOne({ idLeague: tournamentId }) as LeagueType

    if (!leagueSbobetData) {
      const dataLeagueSbobet = NameLeague.findAll({ platform: PLATFORM.SBOBET }) as NameLeagueType[]
      const standardLeagueName = dataLeagueSbobet.find(
        (leagueSbobet) => leagueSbobet.nameLeague === nameLeagueTarget
      )

      const newLeague = {
        idLeague: tournamentId,
        league: standardLeagueName?.league ?? nameLeagueTarget.toUpperCase(),
        nameLeague: tournamentName
      }

      LeagueSbobet.create(newLeague)
      leagueSbobetData = newLeague as LeagueType
    }
    const existingEvent = EventSbobet.findOne({ idEvent: event.id }) as EventSbobetType

    if (existingEvent) {
      if (GAME_TYPES.RUNNING == gameType) {
        const variables = {
          query: { id: event.id }
        }

        const variablesString = encodeURIComponent(JSON.stringify(variables))

        const fetchResultLiveUrl = `${SBO_CONFIG.FETCH_EVENT}?operationName=LiveScoreQuery&variables=${variablesString}&extensions=${encodeURIComponent(
          JSON.stringify({
            persistedQuery: {
              sha256Hash: SBO_CONFIG.SHA256_HASH_LIVE_SCORE_QUERY,
              version: 1
            }
          })
        )}`

        const resLiveScore = await fetch(fetchResultLiveUrl, {
          headers,
          method: 'GET',
          ...(proxyAgent && { agent: proxyAgent })
        })

        await checkCloudflare(resLiveScore, account)

        const parsedLiveScoreQuery = await parseGraphQLResponse(resLiveScore, 'LiveScoreQuery')
        if (parsedLiveScoreQuery.error) throw parsedLiveScoreQuery.error

        const dataLiveScore = parsedLiveScoreQuery

        const updatedFields: Partial<EventSbobetType> = {}

        const liveScore = dataLiveScore?.data?.liveScore

        let newHomeScore = 0
        let newAwayScore = 0
        let newPeriod = 1

        if (liveScore?.betConstruct) {
          newHomeScore = liveScore.betConstruct.setHomeScore
          newAwayScore = liveScore.betConstruct.setAwayScore
          newPeriod = liveScore.betConstruct.inPlayPeriod
        } else if (liveScore?.sdt) {
          newHomeScore = liveScore.sdt.homeScore
          newAwayScore = liveScore.sdt.awayScore
        } else if (liveScore?.betRadar) {
          newHomeScore = liveScore.betRadar.setHomeScore
          newAwayScore = liveScore.betRadar.setAwayScore
        }

        updatedFields.livehomescore = newHomeScore
        updatedFields.liveawayscore = newAwayScore
        updatedFields.liveperiod = newPeriod

        updatedFields.livetimer = getMatchMinute(
          event.mainMarketEventResult?.extraInfo?.periodStartTime,
          event.mainMarketEventResult?.extraInfo?.period
        )

        const nameHome = event.homeTeam.teamName.find((n) => n.language === 'EN')?.value ?? ''
        const nameAway = event.awayTeam.teamName.find((n) => n.language === 'EN')?.value ?? ''

        if (existingEvent.nameHome !== nameHome) {
          updatedFields.nameHome = nameHome
        }

        if (existingEvent.nameAway !== nameAway) {
          updatedFields.nameAway = nameAway
        }

        if (existingEvent.nameLeague !== leagueSbobetData?.nameLeague) {
          updatedFields.nameLeague = leagueSbobetData?.nameLeague ?? ''
        }

        if (existingEvent.league !== leagueSbobetData?.league) {
          updatedFields.league = leagueSbobetData?.league ?? ''
        }

        if (Object.keys(updatedFields).length > 0) {
          EventSbobet.update({ idEvent: event.id }, updatedFields)
        }
      }
    } else {
      const leagueSbobet = leagueSbobetData as LeagueType
      const [standardHomeName, standardAwayName] = [
        findStandardTeam({
          nameLeague: leagueSbobet.nameLeague,
          nameTeam: event?.homeTeam?.teamName.find((n) => n.language === 'EN')?.value.trim(),
          platform: PLATFORM.SBOBET
        }) as NameTeamType,
        findStandardTeam({
          nameLeague: leagueSbobet.nameLeague,
          nameTeam: event?.awayTeam?.teamName.find((n) => n.language === 'EN')?.value.trim(),
          platform: PLATFORM.SBOBET
        }) as NameTeamType
      ]

      const nameHome = String(event.homeTeam.teamName.find((n) => n.language === 'EN')?.value ?? '')
      const nameAway = String(event.awayTeam.teamName.find((n) => n.language === 'EN')?.value ?? '')

      const showTime = event.showTime

      const newEvent = {
        idEvent: event.id,
        showTime,
        away: standardAwayName?.team || formatPlayerName(nameAway),
        awayred: null,
        home: standardHomeName?.team || formatPlayerName(nameHome),
        homered: null,
        idLeague: leagueSbobet.idLeague ?? tournamentId,
        isht:
          event.mainMarketEventResult?.extraInfo?.period === 1 && event.isLive === false
            ? 'HT'
            : '',
        league: (standardHomeName?.league || leagueSbobet.league) ?? '',
        liveHandicapType: event.mainMarketEventResult?.liveHandicapType,
        liveawayscore: event.mainMarketEventResult?.extraInfo?.awayScore ?? 0,
        livehomescore: event.mainMarketEventResult?.extraInfo?.homeScore ?? 0,
        liveperiod: event.mainMarketEventResult?.extraInfo?.period ?? 1,
        livetimer: getMatchMinute(
          event.mainMarketEventResult?.extraInfo?.periodStartTime,
          event.mainMarketEventResult?.extraInfo?.period
        ),
        nameAway,
        nameHome,
        nameLeague: leagueSbobet.nameLeague ?? '',
        nonLiveHandicapType: event.mainMarketEventResult?.nonLiveHandicapType
      }
      Sbobet.delete({ idEvent: event.id })

      EventSbobet.create(newEvent)
    }
  }

  if (!isAccountActive(account.id) || !checkGameType()) return false

  const timeEnd = new Date().getTime()
  await logAndNotify(
    port,
    account,
    `Handle Data League Done. (${eventsLength}, ${timeEnd - timeStart}ms)`
  )

  return true
}

const handleDataSbobetOdds = async ({
  dataSbobetEvent,
  account,
  oddsToken,
  authToken,
  proxyAgent
}) => {
  await logAndNotify(port, account, `Start Handle Data Odds... (${gameType})`)

  const Sbobet = createModel(PLATFORM.SBOBET, dataCrawlByPlatformSchema)
  const BATCH_SIZE: number = 50
  const records: any[] = []

  const timeStart = new Date().getTime()
  let eventsLength = dataSbobetEvent.data.events.length

  for (const event of dataSbobetEvent.data.events) {
    const settings = Setting.findAll() as SettingSchemaType[]
    if (gameType != settings[0].gameType) {
      await logAndNotify(port, account, 'GameType changed during crawl, stop processing.')
      return
    }

    const timeStart = new Date().getTime()
    eventsLength--

    if (!isAccountActive(account.id) || !checkGameType()) return

    const presetFilter = gameType === 'Running' ? 'Live' : 'NonLive'
    const variablesString = encodeURIComponent(
      JSON.stringify({
        query: {
          excludeMarketGroupIds: null,
          filter: presetFilter,
          id: event.id,
          marketGroupIds: null,
          oddsCategory: 'All',
          oddsToken: oddsToken,
          priceStyle: 'Malay'
        }
      })
    )
    const headers = {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
      authorization: authToken,
      'content-type': 'application/json',
      referer: account.host,
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Cookie: 'INGRESSCOOKIE=' + account.cookie,
      ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
    }

    const fetchResultUrl = `${new URL(SBO_CONFIG.FETCH_EVENT)}?operationName=OddsQuery&variables=${variablesString}&extensions=${encodeURIComponent(
      JSON.stringify({
        persistedQuery: {
          sha256Hash: SBO_CONFIG.SHA256_HASH_ODDS_QUERY,
          version: 1
        }
      })
    )}`

    const resOddsQuery = await fetch(fetchResultUrl, {
      headers,
      method: 'GET',
      ...(proxyAgent && { agent: proxyAgent })
    })

    await checkCloudflare(resOddsQuery, account)

    const parsedOddsQuery = await parseGraphQLResponse(resOddsQuery, 'OddsQuery')
    if (parsedOddsQuery.error) throw parsedOddsQuery.error

    const dataSbobet = parsedOddsQuery

    if (dataSbobet?.errors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) {
      isAccountActive(account.id) &&
        port.postMessage({
          type: 'LoggedAgain',
          idAccount: account.id
        })
      return
    }

    const matchInfo = (await EventSbobet.findOne({
      idEvent: event.id
    })) as any

    if (!matchInfo?.league || !dataSbobet?.data?.eventOdds) continue
    Sbobet.delete({ idEvent: event.id })

    for (const oddsEvent of dataSbobet.data.eventOdds) {
      if (
        !oddsEvent.marketType.includes('Handicap') &&
        !oddsEvent.marketType.includes('OverUnder')
      ) {
        continue
      }

      let checkField = ''
      if (presetFilter === 'Live') {
        checkField = matchInfo.liveHandicapType
      } else {
        checkField = matchInfo.nonLiveHandicapType
      }
      let hdp_point = 0
      if (checkField === 'Away' && oddsEvent.point < 0) {
        hdp_point = Math.abs(oddsEvent.point)
      } else {
        hdp_point = oddsEvent.point * -1
      }

      const findTicket = Sbobet.findOne({
        altLineId: oddsEvent?.id
      }) as DataCrawlType

      const targetType = getTargetType(
        oddsEvent.marketType,
        oddsEvent.eventResult.marketGroup.marketGroupName
      )

      if (!findTicket && targetType) {
        const dateObj = new Date(matchInfo.showTime)
        const date = dateObj.toLocaleDateString('en-US', {
          day: '2-digit',
          month: '2-digit'
        })

        dateObj.setHours(dateObj.getHours() - 1)

        const time = dateObj.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })

        const oddsOffset =
          gameType === GAME_TYPES.TODAY || gameType === GAME_TYPES.RUNNING ? 0.02 : 0.01

        const dataSave = {
          gameType,
          date,
          time,
          HDP: CONVERT_HDP[toPositiveNumber(Math.abs(oddsEvent.point))],
          altLineId: oddsEvent.id,
          away: matchInfo.away.toUpperCase(),
          bettype: oddsEvent.isLive ? 1 : 0,
          hdp_point: oddsEvent.marketType.includes('Handicap') ? hdp_point : Math.abs(hdp_point),
          home: matchInfo.home.toUpperCase(),
          home_over:
            Number(oddsEvent.prices[0].price) == -1
              ? Number(oddsEvent.prices[0].price) * -1 - oddsOffset
              : Number(oddsEvent.prices[0].price) - oddsOffset,
          away_under:
            Number(oddsEvent.prices[1].price) == -1
              ? Number(oddsEvent.prices[1].price) * -1 - oddsOffset
              : Number(oddsEvent.prices[1].price) - oddsOffset,
          idEvent: event?.id,
          idLeague: matchInfo?.idLeague ?? '',
          league: matchInfo.league.toUpperCase(),
          nameAway: matchInfo?.nameAway,
          nameHome: matchInfo?.nameHome,
          nameLeague: matchInfo?.nameLeague ?? '',
          platform: PLATFORM.SBOBET,
          score:
            gameType === GAME_TYPES.RUNNING
              ? `${matchInfo?.livehomescore ?? 0}-${matchInfo?.liveawayscore ?? 0}`
              : null,
          specialOdd: SBO_CONFIG_TYPE_ODD[oddsEvent.marketType],
          stat: gameType === GAME_TYPES.RUNNING ? 'LIVE' : null,
          targetType,
          type: oddsEvent.marketType.includes('Handicap') ? 'HDP' : 'OU',
          typeOdd: oddsEvent.marketType.includes('Handicap') ? SPREAD : TOTAL
        }

        records.push(dataSave)
        if (records.length >= BATCH_SIZE) {
          insertRecords(records, Sbobet)
        }
      }

      if (records.length > 0) {
        insertRecords(records, Sbobet)
      }
    }

    port.postMessage({
      type: 'CrawlDone',
      platformName: PLATFORM.SBOBET
    })
    const timeEnd = new Date().getTime()

    await logAndNotify(
      port,
      account,
      `Handle Data Odds Done. (${eventsLength}, ${timeEnd - timeStart}ms)`
    )
  }

  if (!isAccountActive(account.id) || !checkGameType()) return
  const timeEnd = new Date().getTime()
  await logAndNotify(
    port,
    account,
    `Handle Data Odds Done All. (${eventsLength}, ${timeEnd - timeStart}ms)`
  )
}
