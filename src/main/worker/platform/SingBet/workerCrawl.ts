/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { setTimeout } from 'timers/promises'
import { parentPort } from 'worker_threads'

import { Account, clearTable, createModel, Setting } from '@db/model'
import dataCrawlByPlatformSchema from '@db/schema/dataCrawlByPlatform'
import { SettingSchemaType } from '@db/schema/setting'

import { GAME_TYPES } from '@shared/common/constants'
import { AccountType, NameTeamType } from '@shared/common/types'
import { STATUS_ACCOUNT, STATUS_LOGIN } from '@shared/main/constants'

import { isAccountActive } from '@/worker/lib/checkAccount'
import { checkGameType } from '@/worker/lib/checkGameType'
import { logAndNotify, logCrawlError } from '@/worker/lib/exitAccountWithLog'
import { findStandardTeam } from '@/worker/lib/findStandardTeam'
import { insertRecords } from '@/worker/lib/insertRecords'
import { systemLogToFile } from '@/worker/lib/systemLogToFile'
import { PLATFORM } from '@/worker/platform/platform.config'
import { getBalanceSingBet } from '@/worker/platform/SingBet/actions/getBalance'
import { getDataSingBet } from '@/worker/platform/SingBet/actions/getData'
import { handlePlay } from '@/worker/platform/SingBet/helper'

let gameType: string | null = null

const port = parentPort
if (!port) throw new Error('IllegalState')

port.on('message', async (action: string) => {
  if (action == 'Start') {
    try {
      await handleCrawlData()
    } catch (error) {
      await systemLogToFile(`Error Handle Crawl Data SingBet: ${JSON.stringify(error)}`, 'Error')
    }
  }
})

const handleCrawlData = async () => {
  while (true) {
    clearTable(PLATFORM.SINGBET)

    const account = Account.findOne({
      platformName: PLATFORM.SINGBET,
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
  try {
    const settings = Setting.findAll() as SettingSchemaType[]
    if (!settings.length) return

    gameType = settings[0].gameType
    if (!gameType || gameType === GAME_TYPES.NONE) return

    const accountInfo = Account.findOne({
      id: account.id,
      orderID: 1,
      status: STATUS_ACCOUNT.LOGOUT,
      statusLogin: STATUS_LOGIN.SUCCESS
    }) as AccountType
    if (!accountInfo) return

    if (accountInfo.typeCrawl !== gameType) {
      await logAndNotify(port, account, 'GameType changed, check box refresh to sync.', {
        fields: { status: STATUS_ACCOUNT.EXIT }
      })

      clearTable(PLATFORM.SINGBET)
      return
    }

    const { ErrorCode, Message, credit, cashBalance, outstanding, givenCredit, currency } =
      await getBalanceSingBet(account)

    if (ErrorCode != 0) throw new Error(`Request Get Balance SingBet Failed ${Message}`)

    await logAndNotify(port, account, `Balance updated: ${credit} ${currency}`, {
      fields: { credit, cashBalance, outstanding, givenCredit, currency }
    })

    if (!isAccountActive(account.id)) return

    await logAndNotify(port, account, `Get Tennis ${gameType}...`, {
      strictMatch: { orderID: 1, platformName: PLATFORM.SINGBET }
    })

    const { code, message, data } = await getDataSingBet(account, gameType)

    if (code == 1) {
      if (isAccountActive(account.id)) {
        Account.update(
          { id: account.id },
          {
            textLog: message
          }
        )
        port.postMessage({ type: 'DataUpdateAccount', idAccount: account.id })
      }
      clearTable(PLATFORM.SINGBET)

      port.postMessage({
        type: 'CrawlDone',
        platformName: PLATFORM.SINGBET
      })

      return
    }

    if (code != 0) throw new Error(`Request Get Data SingBet Failed ${message}`)

    await logAndNotify(port, account, message)

    await handleData({ data, account })
  } catch (error) {
    await logCrawlError(port, account, error, 'Crawl Data SingBet', {
      clearTablePlatform: PLATFORM.SINGBET
    })
  }
}

const handleData = async ({ data, account }) => {
  clearTable(PLATFORM.SINGBET)

  if (!gameType || gameType === GAME_TYPES.NONE) return
  const SingBet = createModel(PLATFORM.SINGBET, dataCrawlByPlatformSchema)

  const timeStart = new Date().getTime()
  const records: any[] = []
  const eventsLength = Object.keys(data).length
  const isRunning = gameType === GAME_TYPES.RUNNING

  for (const [eventIndex, event] of data.entries()) {
    if (!isAccountActive(account.id)) return
    if (!checkGameType(account.platformName, gameType)) {
      await logAndNotify(port, account, 'GameType changed during crawl, stop processing.')
      return
    }

    const timeEventStart = new Date().getTime()

    const nameLeague = event.LEAGUE.trim()
    const nameHome = event.TEAM_H.trim()
    const nameAway = event.TEAM_C.trim()

    const standardHomeName = findStandardTeam({
      nameTeam: nameHome,
      nameLeague: nameLeague,
      platform: PLATFORM.SINGBET
    }) as NameTeamType

    const standardAwayName = findStandardTeam({
      nameTeam: nameAway,
      nameLeague: nameLeague,
      platform: PLATFORM.SINGBET
    }) as NameTeamType

    const [md, rawTime] = event.DATETIME.split(' ')
    const [month, day] = md.split('-')
    const [h, m] = rawTime.match(/\d+/g).map(Number)

    const hour = rawTime.endsWith('p') ? (h % 12) + 12 : h % 12

    const date = `${month}/${day}`
    const time = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    const base = {
      gameType,
      date,
      time,
      platform: PLATFORM.SINGBET,
      idLeague: event.LID,
      nameLeague,
      idEvent: event.GIDM,
      nameHome,
      nameAway,
      isHomeStrong: Number(event.STRONG === 'H'),
      score: isRunning ? `0-0` : null,
      stat: isRunning ? 'LIVE' : null,
      league: standardHomeName?.league?.toLocaleUpperCase() ?? nameLeague.toLocaleUpperCase(),
      home: standardHomeName?.team?.toLocaleUpperCase() ?? nameHome.toLocaleUpperCase(),
      away: standardAwayName?.team?.toLocaleUpperCase() ?? nameAway.toLocaleUpperCase()
    }

    for (let i = 1; i <= 8; i++) {
      const PLAY = event?.[`PLAY${i}`]
      if (!PLAY) continue

      handlePlay({
        PLAY,
        event,
        base,
        isRunning,
        records
      })
    }

    if (records.length) {
      insertRecords(records, SingBet)
    }

    const timeEventEnd = new Date().getTime()
    await logAndNotify(
      port,
      account,
      `Handle Data Event. (${eventIndex + 1}/${eventsLength}, ${timeEventEnd - timeEventStart}ms)`
    )
  }

  port.postMessage({
    type: 'CrawlDone',
    platformName: PLATFORM.SINGBET
  })
  const timeEnd = new Date().getTime()
  await logAndNotify(
    port,
    account,
    `Event processing completed. (${eventsLength}, ${timeEnd - timeStart}ms)`,
    { strictMatch: { orderID: 1, platformName: PLATFORM.SINGBET } }
  )
}
