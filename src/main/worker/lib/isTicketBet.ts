import { TARGET_TYPE } from '@shared/common/constants'
import { SportBookSettingType, TicketInfoDataBetType } from '@shared/common/types'
import { DataPairPlatformType } from '@shared/common/types'

import { isOddInRange } from '@/worker/lib/isOddInRange'

export function isTicketBet(
  platform: {
    info: string
    setting: SportBookSettingType
    ticket: DataPairPlatformType | TicketInfoDataBetType
  },
  gameType: string
): boolean {
  const { setting, ticket } = platform
  const { typeOdd, targetType, hdp_point, bet, nameHome, nameAway } = ticket

  if (setting.generalSetting == 'BetAll') return true
  if (setting.generalSetting == 'NoBet') return false

  const HDP_VALUES_SET_FT_HDP = generateRange(2.5)
  const HDP_VALUES_SET_1ST_GAME_OU = generateRange(13)
  const HDP_VALUES_GAME_FT_HDP = generateRange(18)
  const HDP_VALUES_GAME_FT_OU = generateRange(65)

  const checks = [
    {
      betConditions: true,
      detail: setting.SET_FT_HDP_PK_Detail,
      enabled: setting.SET_FT_HDP_PK,
      hdpRequired: hdp_point === 0,
      numberRequired: targetType === TARGET_TYPE.SET,
      typeOdd: typeOdd === 'SPREAD'
    },
    {
      betConditions: true,
      detail: setting.GAME_FT_HDP_PK_Detail,
      enabled: setting.GAME_FT_HDP_PK,
      hdpRequired: hdp_point === 0,
      numberRequired: targetType === TARGET_TYPE.GAME,
      typeOdd: typeOdd === 'SPREAD'
    },
    {
      betConditions:
        setting.SET_FT_HDP_PUT_Detail.betTo.betAll ||
        HDP_VALUES_SET_FT_HDP.some((val) => {
          const key = `hdp_${val.toString().replace('.', '_')}`
          let checkPoint = false
          if (hdp_point < 0 && bet === nameHome) {
            checkPoint = hdp_point === -val
          }

          if (hdp_point > 0 && bet === nameAway) {
            checkPoint = hdp_point === val
          }
          return setting.SET_FT_HDP_PUT_Detail.betTo[key] && checkPoint
        }),
      detail: setting.SET_FT_HDP_PUT_Detail,
      enabled: setting.SET_FT_HDP_PUT,
      hdpRequired: (hdp_point < 0 && bet === nameHome) || (hdp_point > 0 && bet === nameAway),
      numberRequired: targetType === TARGET_TYPE.SET,
      typeOdd: typeOdd === 'SPREAD'
    },
    {
      betConditions:
        setting.GAME_FT_HDP_PUT_Detail.betTo.betAll ||
        HDP_VALUES_GAME_FT_HDP.some((val) => {
          const key = `hdp_${val.toString().replace('.', '_')}`
          let checkPoint = false
          if (hdp_point < 0 && bet === nameHome) {
            checkPoint = hdp_point === -val
          }

          if (hdp_point > 0 && bet === nameAway) {
            checkPoint = hdp_point === val
          }
          return setting.GAME_FT_HDP_PUT_Detail.betTo[key] && checkPoint
        }),
      detail: setting.GAME_FT_HDP_PUT_Detail,
      enabled: setting.GAME_FT_HDP_PUT,
      hdpRequired: (hdp_point < 0 && bet === nameHome) || (hdp_point > 0 && bet === nameAway),
      numberRequired: targetType === TARGET_TYPE.GAME,
      typeOdd: typeOdd === 'SPREAD'
    },

    {
      betConditions:
        setting.SET_FT_HDP_EAT_Detail.betTo.betAll ||
        HDP_VALUES_SET_FT_HDP.some((val) => {
          const key = `hdp_${val.toString().replace('.', '_')}`
          let checkPoint = false
          if (hdp_point > 0 && bet === nameHome) {
            checkPoint = hdp_point === val
          }

          if (hdp_point < 0 && bet === nameAway) {
            checkPoint = hdp_point === -val
          }
          return setting.SET_FT_HDP_EAT_Detail.betTo[key] && checkPoint
        }),
      detail: setting.SET_FT_HDP_EAT_Detail,
      enabled: setting.SET_FT_HDP_EAT,
      hdpRequired: (hdp_point > 0 && bet === nameHome) || (hdp_point < 0 && bet === nameAway),
      numberRequired: targetType === TARGET_TYPE.SET,
      typeOdd: typeOdd === 'SPREAD'
    },
    {
      betConditions:
        setting.GAME_FT_HDP_EAT_Detail.betTo.betAll ||
        HDP_VALUES_GAME_FT_HDP.some((val) => {
          const key = `hdp_${val.toString().replace('.', '_')}`
          let checkPoint = false
          if (hdp_point > 0 && bet === nameHome) {
            checkPoint = hdp_point === val
          }

          if (hdp_point < 0 && bet === nameAway) {
            checkPoint = hdp_point === -val
          }
          return setting.GAME_FT_HDP_EAT_Detail.betTo[key] && checkPoint
        }),
      detail: setting.GAME_FT_HDP_EAT_Detail,
      enabled: setting.GAME_FT_HDP_EAT,
      hdpRequired: (hdp_point > 0 && bet === nameHome) || (hdp_point < 0 && bet === nameAway),
      numberRequired: targetType === TARGET_TYPE.GAME,
      typeOdd: typeOdd === 'SPREAD'
    },

    {
      betConditions:
        setting.SET_1ST_GAME_OVER_Detail.betTo.betAll ||
        HDP_VALUES_SET_1ST_GAME_OU.some((val) => {
          const key = `hdp_${val.toString().replace('.', '_')}`
          return setting.SET_1ST_GAME_OVER_Detail.betTo[key] && hdp_point === val
        }),
      detail: setting.SET_1ST_GAME_OVER_Detail,
      enabled: setting.SET_1ST_GAME_OVER,
      hdpRequired: hdp_point > 0 && bet === 'Over',
      numberRequired: targetType === TARGET_TYPE.FIRST_SET,
      typeOdd: typeOdd === 'TOTAL'
    },
    {
      betConditions:
        setting.GAME_FT_OVER_Detail.betTo.betAll ||
        HDP_VALUES_GAME_FT_OU.some((val) => {
          const key = `hdp_${val.toString().replace('.', '_')}`
          return setting.GAME_FT_OVER_Detail.betTo[key] && hdp_point === val
        }),
      detail: setting.GAME_FT_OVER_Detail,
      enabled: setting.GAME_FT_OVER,
      hdpRequired: hdp_point > 0 && bet === 'Over',
      numberRequired: targetType === TARGET_TYPE.GAME,
      typeOdd: typeOdd === 'TOTAL'
    },
    {
      betConditions:
        setting.SET_1ST_GAME_UNDER_Detail.betTo.betAll ||
        HDP_VALUES_SET_1ST_GAME_OU.some((val) => {
          const key = `hdp_${val.toString().replace('.', '_')}`
          return setting.SET_1ST_GAME_UNDER_Detail.betTo[key] && hdp_point === val
        }),
      detail: setting.SET_1ST_GAME_UNDER_Detail,
      enabled: setting.SET_1ST_GAME_UNDER,
      hdpRequired: hdp_point > 0 && bet === 'Under',
      numberRequired: targetType === TARGET_TYPE.FIRST_SET,
      typeOdd: typeOdd === 'TOTAL'
    },
    {
      betConditions:
        setting.GAME_FT_UNDER_Detail.betTo.betAll ||
        HDP_VALUES_GAME_FT_OU.some((val) => {
          const key = `hdp_${val.toString().replace('.', '_')}`
          return setting.GAME_FT_UNDER_Detail.betTo[key] && hdp_point === val
        }),
      detail: setting.GAME_FT_UNDER_Detail,
      enabled: setting.GAME_FT_UNDER,
      hdpRequired: hdp_point > 0 && bet === 'Under',
      numberRequired: targetType === TARGET_TYPE.GAME,
      typeOdd: typeOdd === 'TOTAL'
    }
  ]

  for (const check of checks) {
    if (!check.typeOdd) continue
    if (!check.enabled) continue
    if (!check.numberRequired) continue
    if (!check.hdpRequired) continue

    const range = check.detail?.range
    const isInRange =
      (range?.running && gameType === 'Running') ||
      (range?.today && gameType === 'Today') ||
      (range?.early && gameType === 'Early')

    if (!isInRange) continue

    if (check.detail?.range.checkOdd) {
      if (!isOddInRange(setting.oddFrom, setting.oddTo, String(ticket.odd))) continue
    }

    if (check.betConditions) {
      return true
    }
  }

  return false
}

function generateRange(maxValue: number): number[] {
  const step = 0.25
  const result: number[] = []
  for (let i = 0; i <= maxValue; i += step) {
    result.push(parseFloat(i.toFixed(2)))
  }
  return result
}
