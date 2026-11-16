/* eslint-disable no-constant-condition */
const { parentPort, workerData } = require('worker_threads')
import { setTimeout } from 'timers/promises'

import { BetListResult, createModel, DataBet, Setting, SportBookCombination } from '@db/model'
import dataCrawlByPlatformSchema from '@db/schema/dataCrawlByPlatform'
import { SettingSchemaType } from '@db/schema/setting'
import { SportBookCombinationDBType } from '@db/schema/sportBookCombination'

import { GAME_TYPES, OVER, SPREAD, UNDER } from '@shared/common/constants'
import { SportBookSettingType } from '@shared/common/types'
import { DataCrawlType } from '@shared/common/types'

import { TABLE_NAME_BY_PLATFORM } from '../platform/platform.config'

import { calculateProfit } from '@/worker/lib/calculateProfit'
import { checkOddsSetting } from '@/worker/lib/checkOddsSetting'
import { clearTablesForGameType } from '@/worker/lib/clearTablesForGameType'
import { generateTicketUpdate } from '@/worker/lib/generateTicketUpdate'
import { handleCheckCombinationSetting } from '@/worker/lib/handleCheckCombinationSetting'
import { isValidData } from '@/worker/lib/isValidData'
import { validateRunningScore } from '@/worker/lib/validateRunningScore'

let gameType: string | null = null
const key = workerData.pair as string

async function startWorking() {
  while (true) {
    const platformPair = SportBookCombination.findOne({ key }) as SportBookCombinationDBType
    if (!platformPair) return
    const sportBook1 = JSON.parse(platformPair.sportBook1) as SportBookSettingType
    const sportBook2 = JSON.parse(platformPair.sportBook2) as SportBookSettingType
    await handleCombinationPlatform(platformPair, sportBook1, sportBook2)

    await setTimeout(1500)
  }
}

startWorking()

async function handleCombinationPlatform(
  platformPair: SportBookCombinationDBType,
  sportBook1: SportBookSettingType,
  sportBook2: SportBookSettingType
) {
  const [Platform1_Model, Platform2_Model] = [
    createModel(
      TABLE_NAME_BY_PLATFORM[sportBook1.name] ?? sportBook1.name,
      dataCrawlByPlatformSchema
    ),
    createModel(
      TABLE_NAME_BY_PLATFORM[sportBook2.name] ?? sportBook2.name,
      dataCrawlByPlatformSchema
    )
  ]

  const listDataCrawlPlatform1 = Platform1_Model.findAll() as DataCrawlType[]
  if (!listDataCrawlPlatform1.length) return

  for (const dataCrawlPlatform1 of listDataCrawlPlatform1) {
    const settingInfo = Setting.findAll()[0] as SettingSchemaType

    if (gameType !== settingInfo.gameType) {
      gameType = settingInfo.gameType
      clearTablesForGameType()
      return
    }
    const { league, home, away, typeOdd, hdp_point, targetType, score } = dataCrawlPlatform1
    if (!league || !home || !away) continue

    const isRunning = settingInfo.gameType === GAME_TYPES.RUNNING
    if (isRunning && !score) continue

    if (isValidData(dataCrawlPlatform1) == false) continue

    const dataCrawlPlatform2 = Platform2_Model.findOne({
      league,
      home,
      away,
      typeOdd,
      hdp_point,
      targetType
    }) as DataCrawlType

    if (!dataCrawlPlatform2) continue

    if (isValidData(dataCrawlPlatform2) == false) continue

    const profitCombos = [
      {
        odd1: dataCrawlPlatform1.home_over,
        odd1Sub: dataCrawlPlatform1.away_under,

        odd2: dataCrawlPlatform2.away_under,
        odd2Sub: dataCrawlPlatform2.home_over,

        bet1: dataCrawlPlatform1.typeOdd === SPREAD ? dataCrawlPlatform1.nameHome : OVER,
        bet1Sub: dataCrawlPlatform1.typeOdd === SPREAD ? dataCrawlPlatform1.nameAway : UNDER,

        bet2: dataCrawlPlatform2.typeOdd === SPREAD ? dataCrawlPlatform2.nameAway : UNDER,
        bet2Sub: dataCrawlPlatform2.typeOdd === SPREAD ? dataCrawlPlatform2.nameHome : OVER
      },
      {
        odd1: dataCrawlPlatform1.away_under,
        odd1Sub: dataCrawlPlatform1.home_over,

        odd2: dataCrawlPlatform2.home_over,
        odd2Sub: dataCrawlPlatform2.away_under,

        bet1: dataCrawlPlatform1.typeOdd === SPREAD ? dataCrawlPlatform1.nameAway : UNDER,
        bet1Sub: dataCrawlPlatform1.typeOdd === SPREAD ? dataCrawlPlatform1.nameHome : OVER,

        bet2: dataCrawlPlatform2.typeOdd === SPREAD ? dataCrawlPlatform2.nameHome : OVER,
        bet2Sub: dataCrawlPlatform2.typeOdd === SPREAD ? dataCrawlPlatform2.nameAway : UNDER
      }
    ]

    for (const { odd1, odd1Sub, odd2, odd2Sub, bet1, bet1Sub, bet2, bet2Sub } of profitCombos) {
      const profitResult = calculateProfit(Number(odd1), Number(odd2))
      if (profitResult.status !== 'OK') continue

      const checkOdds = checkOddsSetting(odd1, odd2, profitResult.profit)
      if (checkOdds.ErrorCode == 1) continue

      const score =
        gameType === GAME_TYPES.RUNNING
          ? (dataCrawlPlatform1.score ?? dataCrawlPlatform2.score)
          : ''

      const stat = dataCrawlPlatform1.stat ?? dataCrawlPlatform2.stat ?? ''
      const type = dataCrawlPlatform1.type ?? dataCrawlPlatform2.type

      const commonData = { score, stat, type }

      const dataTicketI = { ...dataCrawlPlatform1, ...commonData } as DataCrawlType
      const dataTicketII = { ...dataCrawlPlatform2, ...commonData } as DataCrawlType

      const is_valid_score_running = validateRunningScore(score, settingInfo)

      if (is_valid_score_running === false) continue

      const ticketUpdate = generateTicketUpdate(
        dataTicketI,
        bet1,
        bet1Sub,
        odd1,
        odd1Sub,
        checkOdds.Data.infoOdd1,
        dataTicketII,
        bet2,
        bet2Sub,
        odd2,
        odd2Sub,
        checkOdds.Data.infoOdd2,
        profitResult.profit,
        settingInfo.gameType
      )

      //[Bet Setting] -  Check Combination Setting
      const validBetTicketPairs = handleCheckCombinationSetting(
        ticketUpdate,
        sportBook1,
        sportBook2,
        gameType,
        parentPort
      )

      if (!validBetTicketPairs) continue
      const record = BetListResult.create({ dataPair: JSON.stringify(validBetTicketPairs) })
      parentPort.postMessage({ type: 'BetList', recordDB: record })

      if (DataBet.count() < 50) {
        DataBet.create({
          idPlatformPair: platformPair.id,
          dataPair: JSON.stringify(validBetTicketPairs)
        })
      }
    }
  }
}
