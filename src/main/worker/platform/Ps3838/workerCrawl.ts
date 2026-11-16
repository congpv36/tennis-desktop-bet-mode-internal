/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-constant-condition */
import { setTimeout } from 'timers/promises'
import { parentPort } from 'worker_threads'

import { Account, clearTable, createModel, Setting } from '@db/model'
import dataCrawlByPlatformSchema from '@db/schema/dataCrawlByPlatform'
import { SettingSchemaType } from '@db/schema/setting'
import { HttpsProxyAgent } from 'https-proxy-agent'
import fetch from 'node-fetch'

import {
  CONVERT_HDP,
  GAME_TYPES,
  HDP_FT,
  OU_FT,
  SPREAD,
  TARGET_TYPE,
  TOTAL
} from '@shared/common/constants'
import { AccountType, NameTeamType } from '@shared/common/types'
import { OPTIONS_PROXY, STATUS_ACCOUNT, STATUS_LOGIN } from '@shared/main/constants'

import { accountLogToFile } from '@/worker/lib/accountLogToFile'
import { isAccountActive } from '@/worker/lib/checkAccount'
import { checkGameType } from '@/worker/lib/checkGameType'
import { logAndNotify, logAndTriggerRelogin, logCrawlError } from '@/worker/lib/exitAccountWithLog'
import { findActiveAccount } from '@/worker/lib/findActiveAccount'
import { findStandardTeam } from '@/worker/lib/findStandardTeam'
import { insertRecords } from '@/worker/lib/insertRecords'
import { isProxyConfigValid } from '@/worker/lib/isProxyConfigValid'
import { logTime } from '@/worker/lib/logTime'
import { systemLogToFile } from '@/worker/lib/systemLogToFile'
import { toPositiveNumber } from '@/worker/lib/toPositiveNumber'
import { PLATFORM } from '@/worker/platform/platform.config'
import { getBalancePs3838 } from '@/worker/platform/Ps3838/actions/getBalance'
import {
  buildHeadersBalancePs3838,
  buildHeadersPs3838,
  gameTypeMapPs3838
} from '@/worker/platform/Ps3838/common/contants'
import {
  buildPlatformUrl,
  buildTokenHeaders,
  checkGames,
  parseTokens,
  removeGames
} from '@/worker/platform/Ps3838/helper'

let gameType: string | null = null

const port = parentPort
if (!port) throw new Error('IllegalState')

port.on('message', async (action: string) => {
  if (action == 'Start') {
    try {
      await handleCrawlData()
    } catch (error) {
      await systemLogToFile(`Error Handle Crawl Data Ps3838: ${JSON.stringify(error)}`, 'Error')
    }
  }
})

const handleCrawlData = async () => {
  while (true) {
    clearTable(PLATFORM.PS3838)

    const account = Account.findOne({
      platformName: PLATFORM.PS3838,
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
  }
}
const fnCrawlData = async (account: AccountType) => {
  const settings = Setting.findAll() as SettingSchemaType[]
  if (!settings.length) return

  gameType = settings[0].gameType
  if (!gameType || gameType === GAME_TYPES.NONE) return

  const accountInfo = findActiveAccount(account.id)
  if (!accountInfo) return

  if (accountInfo.typeCrawl !== gameType) {
    await logAndNotify(port, account, 'GameType changed, check box refresh to sync.', {
      fields: { status: STATUS_ACCOUNT.EXIT }
    })

    clearTable(PLATFORM.PS3838)
    return
  }

  const { status, data } = isProxyConfigValid(account)
  const { newIpAddress, newPort, newUsername, newPassword } = data

  const proxyUrl =
    status && account.proxyScope !== OPTIONS_PROXY.NONE
      ? `http://${newUsername}:${newPassword}@${newIpAddress}:${newPort}`
      : undefined

  const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined

  const { ErrorCode, Message, cashBalance, outstanding, givenCredit, credit, currency } =
    await getBalancePs3838(account)

  if (ErrorCode !== 0) {
    await logAndTriggerRelogin(port, account, `Get balance failed: ${Message}`)
    return
  }

  await logAndNotify(port, account, `Balance updated: ${cashBalance} ${currency}`, {
    fields: { cashBalance, outstanding, givenCredit, credit, currency }
  })

  try {
    const tokens = parseTokens(accountInfo.token)
    const resKeepAlive = await fetch(buildPlatformUrl(accountInfo, 'KEEP_ALIVE'), {
      method: 'GET',
      headers: {
        ...buildHeadersBalancePs3838(accountInfo, accountInfo.vHucode),
        ...buildTokenHeaders(tokens),
        Cookie: accountInfo.cookie
      },
      ...(proxyAgent && { agent: proxyAgent })
    })

    const vHucode = resKeepAlive.headers.get('v-hucode')

    if (!vHucode) {
      throw new Error('V-hucode not found')
    }

    const mk: number = gameTypeMapPs3838[gameType] //(0-Early;1-Today;2-Live)

    await accountLogToFile(
      account.platformName,
      account.loginID,
      `Get Tennis ${gameType}...`,
      'Program'
    )
    if (isAccountActive(account.id)) {
      Account.update(
        {
          id: account.id,
          orderID: 1,
          status: STATUS_ACCOUNT.LOGOUT,
          statusLogin: STATUS_LOGIN.SUCCESS,
          platformName: PLATFORM.PS3838
        },
        {
          textLog: `Get Tennis ${gameType}...`
        }
      )
      port.postMessage({ type: 'DataUpdateAccount', idAccount: account.id })
    } else return

    const url = `${account.loginURL}sports-service/sv/compact/events?mk=${mk}&btg=1&c=&cl=100&d=&ec=&ev=&g=QQ%3D%3D&hle=false&ic=false&ice=false&inl=true&l=100&lang=&lg=&lv=0&me=0&me01=&more=false&o=1&ot=4&pa=0&pimo=0%2C1&pn=-1&pv=1&sp=33&tm=0&v=0&locale=en_US&_=${Date.now()}&withCredentials=true`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...buildHeadersPs3838(account, vHucode),
        ...buildTokenHeaders(tokens),
        'x-app-data':
          'dpAOW=q9pmurY_jhI_X;pctag=dc821180-c6c2-4fe5-adaa-5fd0e6fcce72;directusToken=TwEdnphtyxsfMpXoJkCkWaPsL2KJJ3lo;PCTR=1947977955312;BrowserSessionId=d4f68c87-aaba-4d2c-a108-403d6a0331ea;_og=QQ%3D%3D;_ulp=aEJSR05ZdTBuUjZxYldBTUhPQm0wZzFPcXdVbnd5dnhDZ3cwa040QUtlKzc1eHpJMlJOYUx3TG5FZitRcGdrcWJmbk5GWkltSDNQWEJPVkVDR0Npd3c9PXwyOTA2N2ZjNTRkNTk0ZDZlMWEzMzQzOTNiMjkxNDMyMA%3D%3D;custid=id%3DBCB3700234%26login%3D202609232059%26roundTrip%3D202609232059%26hash%3D09ED7967BCBEEBF58E94F9A79D74C272;_userDefaultView=COMPACT;__prefs=W251bGwsNCwxLDAsMSxudWxsLGZhbHNlLDAuMDAwMCxmYWxzZSx0cnVlLCJBTEwiLC0xLG51bGwsdHJ1ZSx0cnVlLGZhbHNlLGZhbHNlLG51bGwsbnVsbCx0cnVlLCJTTUFMTCIsMSx0cnVlXQ%3D%3D;lang=en_US',
        Cookie: account.cookie
      },
      ...(proxyAgent && { agent: proxyAgent })
    })

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await res.text()
      console.error(`${logTime()}Response is not JSON:`, text)
      throw new Error('Received non-JSON response')
    }

    const resData = await res.json()

    let dataPs3838: any
    if (mk === 0 || mk === 1) {
      dataPs3838 = resData.n[0][2]
    } else if (mk === 2) {
      dataPs3838 = resData.l[0][2]
    }

    if (!dataPs3838.length) {
      await accountLogToFile(
        account.platformName,
        account.loginID,
        `Tennis ${gameType}: No data.`,
        'Program'
      )
      if (isAccountActive(account.id)) {
        Account.update(
          {
            id: account.id,
            orderID: 1,
            status: STATUS_ACCOUNT.LOGOUT,
            statusLogin: STATUS_LOGIN.SUCCESS,
            platformName: PLATFORM.PS3838
          },
          {
            textLog: `Tennis ${gameType}: No data.`
          }
        )
        port.postMessage({ type: 'DataUpdateAccount', idAccount: account.id })
      }

      clearTable(PLATFORM.PS3838)
      return
    }

    await handleData({ dataPs3838, account })
  } catch (error) {
    await logCrawlError(port, account, error, 'Crawl Data Ps3838', {
      clearTablePlatform: PLATFORM.PS3838
    })
  }
}

const handleData = async ({ dataPs3838, account }) => {
  clearTable(PLATFORM.PS3838)

  if (!gameType || gameType === GAME_TYPES.NONE) return
  const Ps3838 = createModel(PLATFORM.PS3838, dataCrawlByPlatformSchema)

  const timeStart = new Date().getTime()
  const records: any[] = []
  const eventsLength = dataPs3838.length

  for (const [leagueIndex, league] of dataPs3838.entries()) {
    if (!isAccountActive(account.id)) return
    if (!checkGameType(account.platformName, gameType)) {
      await logAndNotify(port, account, 'GameType changed during crawl, stop processing.')
      return
    }

    const timeLeagueStart = new Date().getTime()
    const [id, name, events] = league

    for (const event of events) {
      if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType)) return

      const idEvent = event[0]
      const nameHome = event[1].trim()
      const nameAway = event[2].trim()

      const dateEvent = new Date(event[4])

      const date = dateEvent.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit'
      })

      const time = dateEvent.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })

      const checkItem = checkGames(nameHome, nameAway)
      const targetType = event[27] == 'Sets' ? TARGET_TYPE.SET : TARGET_TYPE.GAME

      const standardHomeName = findStandardTeam({
        nameLeague: name,
        nameTeam: removeGames(nameHome),
        platform: PLATFORM.PS3838
      }) as NameTeamType

      const standardAwayName = findStandardTeam({
        nameLeague: name,
        nameTeam: removeGames(nameAway),
        platform: PLATFORM.PS3838
      }) as NameTeamType

      const league = standardHomeName?.league || name.toUpperCase()
      const home = standardHomeName?.team || checkItem.home.toUpperCase()
      const away = standardAwayName?.team || checkItem.away.toUpperCase()

      const data_score = event[35]?.[1]
      const hasValidData = Array.isArray(data_score) && data_score.length >= 2

      const score = hasValidData ? `${data_score[0]}-${data_score[1]}` : null
      const stat = GAME_TYPES.RUNNING == gameType ? 'LIVE' : null

      if (gameType == GAME_TYPES.RUNNING && !score && !stat) continue

      if (event && event[8] && event[8]['0'] && event[8]['0'][0]) {
        if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType)) return

        const periodsFull = event[8]['0'][0]
        if (periodsFull && periodsFull.length > 0) {
          for (const periodFull of periodsFull) {
            if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType))
              return
            if (+periodFull[3] == 0 || +periodFull[4] == 0) continue

            records.push({
              gameType,
              date,
              time,
              platform: PLATFORM.PS3838,
              altLineId: periodFull[7],
              away,
              away_under: +periodFull[4],
              HDP: CONVERT_HDP[toPositiveNumber(periodFull[1])],
              betType: HDP_FT,
              hdp_point: periodFull[1],
              home,
              home_over: +periodFull[3],
              idEvent,
              idLeague: id,
              league,
              nameAway,
              nameHome,
              nameLeague: name,
              score,
              specialOdd: periodFull[8],
              stat,
              targetType,
              type: 'HDP',
              typeOdd: SPREAD
            })

            insertRecords(records, Ps3838)
          }
        }
      }

      if (event && event[8] && event[8]['0'] && event[8]['0'][1]) {
        if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType)) return

        const totalsFull = event[8]['0'][1]
        if (totalsFull && totalsFull.length > 0) {
          for (const totalFull of totalsFull) {
            if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType))
              return
            if (+totalFull[2] == 0 || +totalFull[3] == 0) continue

            if (GAME_TYPES.RUNNING != gameType) {
              if (!checkItem.result) continue
            }

            records.push({
              gameType,
              date,
              time,
              platform: PLATFORM.PS3838,
              altLineId: totalFull[4],
              away,
              away_under: +totalFull[3],
              HDP: CONVERT_HDP[toPositiveNumber(totalFull[1])],
              betType: OU_FT,
              hdp_point: totalFull[1],
              home,
              home_over: +totalFull[2],
              idEvent,
              idLeague: id,
              league,
              nameAway,
              nameHome,
              nameLeague: name,
              score,
              specialOdd: totalFull[5],
              stat,
              targetType,
              type: 'OU',
              typeOdd: TOTAL
            })

            insertRecords(records, Ps3838)
          }
        }
      }

      if (event && event[8] && event[8]['1'] && event[8]['1'][0]) {
        if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType)) return

        const totalsFull = event[8]['1'][0]
        if (totalsFull && totalsFull.length > 0) {
          for (const totalFull of totalsFull) {
            if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType))
              return
            if (+totalFull[3] == 0 || +totalFull[4] == 0) continue

            records.push({
              gameType,
              date,
              time,
              platform: PLATFORM.PS3838,
              altLineId: totalFull[7],
              away,
              away_under: +totalFull[4],
              HDP: CONVERT_HDP[toPositiveNumber(totalFull[1])],
              betType: OU_FT,
              hdp_point: totalFull[1],
              home,
              home_over: +totalFull[3],
              idEvent,
              idLeague: id,
              league,
              nameAway,
              nameHome,
              nameLeague: name,
              score,
              specialOdd: totalFull[5],
              stat,
              targetType: checkItem.result ? TARGET_TYPE.FIRST_SET : TARGET_TYPE.SET,
              type: 'HDP',
              typeOdd: SPREAD
            })

            insertRecords(records, Ps3838)
          }
        }
      }

      if (event && event[8] && event[8]['1'] && event[8]['1'][1]) {
        if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType)) return

        const totalsFull = event[8]['1'][1]
        if (totalsFull && totalsFull.length > 0) {
          for (const totalFull of totalsFull) {
            if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType))
              return
            if (+totalFull[2] == 0 || +totalFull[3] == 0) continue

            if (!checkItem.result) continue

            records.push({
              gameType,
              date,
              time,
              platform: PLATFORM.PS3838,
              altLineId: totalFull[4],
              away,
              away_under: +totalFull[3],
              HDP: CONVERT_HDP[toPositiveNumber(totalFull[1])],
              betType: OU_FT,
              hdp_point: totalFull[1],
              home,
              home_over: +totalFull[2],
              idEvent,
              idLeague: id,
              league,
              nameAway,
              nameHome,
              nameLeague: name,
              score,
              specialOdd: totalFull[5],
              stat,
              targetType: TARGET_TYPE.FIRST_SET,
              type: 'OU',
              typeOdd: TOTAL
            })

            insertRecords(records, Ps3838)
          }
        }
      }

      if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType)) return
    }

    const timeLeagueEnd = new Date().getTime()
    await logAndNotify(
      port,
      account,
      `Handle Data League Done. (${leagueIndex + 1}/${eventsLength}, ${timeLeagueEnd - timeLeagueStart}ms)`
    )
  }

  if (records.length > 0) {
    insertRecords(records, Ps3838)
  }

  if (!isAccountActive(account.id) || !checkGameType(account.platformName, gameType)) return

  port.postMessage({
    type: 'CrawlDone',
    platformName: PLATFORM.PS3838
  })
  const timeEnd = new Date().getTime()
  await logAndNotify(
    port,
    account,
    `Handle Data Event Done All. Total (${eventsLength}/${timeEnd - timeStart}ms)`,
    { strictMatch: { orderID: 1, platformName: PLATFORM.PS3838 } }
  )
}
