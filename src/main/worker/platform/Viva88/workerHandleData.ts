/* eslint-disable @typescript-eslint/no-explicit-any */
import { parentPort } from 'worker_threads'

import Model, {
  createModel,
  EventViva88,
  IndexViva88,
  LeagueViva88,
  NameLeague,
  Setting
} from '@db/model'
import dataCrawlByPlatformSchema from '@db/schema/dataCrawlByPlatform'
import { EventViva88Type } from '@db/schema/eventViva88'
import { LeagueViva88Type } from '@db/schema/leagueViva88'
import { SettingSchemaType } from '@db/schema/setting'

import { CONVERT_HDP, GAME_TYPES, TARGET_TYPE } from '@shared/common/constants'
import { SPREAD, TOTAL } from '@shared/common/constants'
import { DataCrawlType, NameLeagueType, NameTeamType } from '@shared/common/types'

import { findStandardTeam } from '@/worker/lib/findStandardTeam'
import { toPositiveNumber } from '@/worker/lib/toPositiveNumber'
import { PLATFORM } from '@/worker/platform/platform.config'
import { getHdpPoint, normalizeLeagueName, removeCountryTag } from '@/worker/platform/Viva88/helper'
const port = parentPort
if (!port) throw new Error('IllegalState')

port.on('message', async ({ data }) => {
  if (!data) return
  await handleData(data)
})

async function handleData(data: any) {
  const Viva88Bet = createModel('Viva88Bet', dataCrawlByPlatformSchema)

  const records: any[] = []
  const BATCH_SIZE: number = 50
  const dataLeagueViva88bet = NameLeague.findAll({ platform: 'Viva88Bet' }) as NameLeagueType[]

  const [type, message, content] = JSON.parse(data.substring(2))

  const targetKeys = [
    'matchid',
    'leagueid',
    'leaguenameen',
    'hteamnameen',
    'ateamnameen',
    'oddsstatus',
    'livehomescore',
    'liveawayscore',
    'isht',
    'bettype',
    'kickofftime',
    'liveperiod',
    'livetimer',
    'oddsid',
    'hdp1',
    'hdp2',
    'parenttypeid',
    'odds1a',
    'odds2a'
  ]

  let finalAbsoluteMap: Record<string, number> = {}
  const dataSetting = Setting.findAll() as SettingSchemaType[]
  const gameType = dataSetting[0].gameType

  if (type === 'm' && message && content) {
    try {
      for (const row of content) {
        if (row[0] === 'f' && typeof row[1] === 'number' && Array.isArray(row[2])) {
          const fieldGroup = row[1]
          const fieldNames = row[2]

          for (const key of targetKeys) {
            const index = fieldNames.indexOf(key)
            if (index !== -1) {
              finalAbsoluteMap[key] = fieldGroup + index
            }
          }
          const hasAllKeys = targetKeys.every((key) => key in finalAbsoluteMap)
          if (hasAllKeys) {
            IndexViva88.deleteAll()
            IndexViva88.create(finalAbsoluteMap)
          }
        }
      }

      if (finalAbsoluteMap && Object.keys(finalAbsoluteMap).length > 0) {
        await IndexViva88.create(finalAbsoluteMap)
      } else {
        const newest = await IndexViva88.getNewest()
        finalAbsoluteMap = newest ? (({ id, ...rest }) => rest)(newest) : {}
      }

      for (const row of content) {
        if (row[1] === 'l') {
          const leagueInfo: Record<string, any> = {}
          for (let i = 0; i < row.length; i += 2) {
            const key = row[i]
            const value = row[i + 1]
            const matchKey = Object.keys(finalAbsoluteMap).find((k) => finalAbsoluteMap[k] == key)
            if (matchKey) {
              leagueInfo[matchKey] = value
            }
          }

          let findLeague: LeagueViva88Type | undefined
          if (leagueInfo.leagueid || leagueInfo.leaguenameen) {
            findLeague = leagueInfo.leagueid
              ? (LeagueViva88.findOne({ idLeague: leagueInfo.leagueid }) as LeagueViva88Type)
              : (LeagueViva88.findOne({ nameLeague: leagueInfo.leaguenameen }) as LeagueViva88Type)

            const nameLeague = leagueInfo.leaguenameen?.trim() ?? ''
            const targetLeagueName = nameLeague

            if (!findLeague) {
              const standardLeague = dataLeagueViva88bet.find(
                ({ nameLeague }) => nameLeague === targetLeagueName
              )

              const league = normalizeLeagueName(standardLeague?.league ?? nameLeague)

              LeagueViva88.create({
                idLeague: leagueInfo.leagueid,
                nameLeague,
                league
              })
            }
          }
        }

        if (row[1] === 'm') {
          const matchInfo: Record<string, any> = {}

          const reverseMap = createReverseMap(finalAbsoluteMap)
          for (let i = 0; i < row.length; i += 2) {
            const key = row[i]
            const value = row[i + 1]
            const matchKey = reverseMap[key]
            if (matchKey) {
              matchInfo[matchKey] = value
            }
          }

          const existingEvent = EventViva88.findOne({
            idEvent: matchInfo.matchid
          }) as EventViva88Type

          if (matchInfo.leagueid === undefined && existingEvent) {
            matchInfo.leagueid = existingEvent.idLeague
            matchInfo.hteamnameen = existingEvent.nameHome
            matchInfo.ateamnameen = existingEvent.nameAway
            matchInfo.isht = existingEvent.isht
          }

          const league = LeagueViva88.findOne({ idLeague: matchInfo.leagueid }) as LeagueViva88Type
          if (!league) continue

          if (
            typeof matchInfo?.hteamnameen !== 'string' ||
            typeof matchInfo?.ateamnameen !== 'string'
          )
            continue

          const nameHome = matchInfo.hteamnameen.trim()
          const nameAway = matchInfo.ateamnameen.trim()

          const formatLeagueName = (name: string) => name

          const standardHomeName = findStandardTeam({
            nameLeague: formatLeagueName(league.nameLeague),
            nameTeam: nameHome,
            platform: PLATFORM.VIVA88BET
          }) as NameTeamType

          const standardAwayName = findStandardTeam({
            nameLeague: formatLeagueName(league.nameLeague),
            nameTeam: nameAway,
            platform: PLATFORM.VIVA88BET
          }) as NameTeamType

          if (!existingEvent) {
            const newEvent = {
              away: standardAwayName?.team || nameAway.toUpperCase(),
              home: standardHomeName?.team || nameHome.toUpperCase(),
              idEvent: matchInfo.matchid,
              idLeague: matchInfo.leagueid,
              isht: matchInfo.isht ? 'HT' : '',
              league: standardAwayName?.league || standardHomeName?.league || '',
              liveawayscore: matchInfo.liveawayscore ?? 0,
              livehomescore: matchInfo.livehomescore ?? 0,
              liveperiod: matchInfo.liveperiod ?? 1,
              livetimer: Number(matchInfo.livetimer) ?? null,
              nameAway: nameAway,
              nameHome: nameHome,
              nameLeague: league.nameLeague
            }
            EventViva88.create(newEvent)
          } else {
            const updateFields: Record<string, any> = {}
            const updateData: Record<string, any> = {}

            let {
              livehomescore: homeScore,
              liveawayscore: awayScore,
              liveperiod,
              livetimer,
              isht
            } = existingEvent

            const isRunning = gameType === GAME_TYPES.RUNNING

            // helper để update nếu giá trị hợp lệ
            const assignIfValid = (key: string, value: any) => {
              if (isRunning && value !== null && value !== undefined) {
                if (key === 'isht') value = ''
                updateData[key] = value
                return value
              }
              return undefined
            }

            // --- UPDATE SCORE, PERIOD, TIMER, ISHT ---
            const newHomeScore = assignIfValid('livehomescore', matchInfo.livehomescore)
            const newAwayScore = assignIfValid('liveawayscore', matchInfo.liveawayscore)
            const newLivePeriod = assignIfValid('liveperiod', matchInfo.liveperiod)
            const newLiveTimer = assignIfValid('livetimer', matchInfo.livetimer)
            const newIsHT = assignIfValid('isht', matchInfo.isht)

            // Gán lại nếu có giá trị mới
            homeScore = newHomeScore ?? homeScore
            awayScore = newAwayScore ?? awayScore
            liveperiod = newLivePeriod ?? liveperiod
            livetimer = newLiveTimer ?? livetimer
            isht = newIsHT ?? isht

            // --- UPDATE DATABASE ---
            if (Object.keys(updateData).length > 0) {
              EventViva88.update({ idEvent: matchInfo.matchid }, updateData)
            }

            if (isRunning) {
              updateFields.score = `${homeScore ?? 0}-${awayScore ?? 0}`
              updateFields.stat = 'Live'
            }

            if (Object.keys(updateFields).length > 0) {
              Viva88Bet.updateMany({ idEvent: matchInfo.matchid }, updateFields)
            }
          }
        }

        if (row[1] === 'o') {
          const matchInfo: Record<string, any> = {}
          for (let i = 0; i < row.length; i += 2) {
            const key = row[i]
            const value = row[i + 1]
            const matchKey = Object.keys(finalAbsoluteMap).find((k) => finalAbsoluteMap[k] == key)
            if (matchKey) {
              matchInfo[matchKey] = value
            }
          }

          let leagueid = matchInfo?.leagueid ?? 0

          const getLeagueid = (await EventViva88.findOne({ idEvent: matchInfo.matchid })) as any

          if (getLeagueid) {
            leagueid = getLeagueid.idLeague
            matchInfo.hteamnameen = getLeagueid.nameHome ?? matchInfo.hteamnameen
            matchInfo.ateamnameen = getLeagueid.nameAway ?? matchInfo.ateamnameen
            matchInfo.leagueid = getLeagueid.idLeague ?? matchInfo.leagueid
            matchInfo.league = getLeagueid.league
            matchInfo.home = getLeagueid.home
            matchInfo.away = getLeagueid.away
            matchInfo.livetimer = matchInfo?.livetimer ?? getLeagueid?.livetimer
            matchInfo.liveperiod = matchInfo?.liveperiod ?? getLeagueid?.liveperiod
            matchInfo.livehomescore = matchInfo?.livehomescore ?? getLeagueid?.livehomescore
            matchInfo.liveawayscore = matchInfo?.liveawayscore ?? getLeagueid?.liveawayscore
          }

          if (leagueid === 0 && matchInfo.oddsid) {
            const findTicketL = (await Viva88Bet.findOne({
              altLineId: matchInfo.oddsid
            })) as any

            leagueid = findTicketL?.idLeague ?? 0
            if (findTicketL) {
              matchInfo.livetimer = matchInfo.livetimer ?? findTicketL.livetimer
              matchInfo.liveperiod = matchInfo.liveperiod ?? findTicketL.liveperiod
            }
          }

          let findLeague: LeagueViva88Type | undefined = undefined

          if (leagueid) {
            findLeague = (await LeagueViva88.findOne({ idLeague: leagueid })) as LeagueViva88Type
          }

          if (!findLeague) continue

          const findTicket = Viva88Bet.findOne({
            altLineId: matchInfo?.oddsid
          }) as DataCrawlType

          if (!matchInfo?.oddsid) continue

          if (!findTicket) {
            if (!matchInfo?.oddsid && !matchInfo?.matchid) continue

            const dateObj = new Date(Number(matchInfo.livetimer) * 1000)
            dateObj.setMinutes(dateObj.getMinutes() + 1)

            const date = dateObj.toLocaleDateString('en-US', {
              day: '2-digit',
              month: '2-digit'
            })

            const time = dateObj.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })

            const dataSave = {
              gameType,
              date,
              time,
              HDP: CONVERT_HDP[toPositiveNumber(Math.abs(getHdpPoint(matchInfo)))],
              altLineId: matchInfo.oddsid,
              away: removeCountryTag(matchInfo.away),
              away_under: matchInfo.odds2a,
              bettype: matchInfo.bettype ?? '',
              hdp_point: getHdpPoint(matchInfo),
              home: removeCountryTag(matchInfo.home),
              home_over: matchInfo.odds1a,
              idEvent: matchInfo.matchid,
              idLeague: leagueid ?? matchInfo?.leagueid ?? '',
              league: removeCountryTag(matchInfo.league),
              nameAway: matchInfo.ateamnameen,
              nameHome: matchInfo.hteamnameen,
              nameLeague: findLeague?.nameLeague ?? matchInfo?.league ?? '',
              platform: PLATFORM.VIVA88BET,
              score:
                GAME_TYPES.RUNNING == gameType
                  ? `${matchInfo.livehomescore ?? 0} - ${matchInfo.liveawayscore ?? 0}`
                  : null,
              specialOdd: null,
              stat: GAME_TYPES.RUNNING == gameType ? 'LIVE' : null,
              targetType:
                matchInfo.parenttypeid === 3 || matchInfo.parenttypeid === 153
                  ? TARGET_TYPE.GAME
                  : TARGET_TYPE.SET,
              type: matchInfo.parenttypeid === 1 || matchInfo.parenttypeid === 153 ? 'HDP' : 'OU',
              typeOdd:
                matchInfo.parenttypeid === 1 || matchInfo.parenttypeid === 153 ? SPREAD : TOTAL
            }

            const requiredFields = [
              'idLeague',
              'nameLeague',
              'idEvent',
              'nameHome',
              'nameAway',
              'altLineId',
              'hdp_point',
              'home_over',
              'away_under'
            ]

            const isComplete = requiredFields.every(
              (key) => dataSave[key] !== undefined && dataSave[key] !== null
            )

            if (isComplete) {
              records.push(dataSave)
              if (records.length >= BATCH_SIZE) {
                insertRecords(records, Viva88Bet)
              }
            }
          } else {
            const updateFields: Record<string, any> = {}

            const parenttypeid = findTicket.betType
            const hdpPoint = findTicket.hdp_point

            const isNegative = hdpPoint.toString().includes('-') // true nếu có dấu '-'
            const isMatchTypeId = [3].includes(parenttypeid) // true

            if (matchInfo.hdp1 !== undefined && matchInfo.hdp2 !== undefined) {
              updateFields.hdp_point = !isMatchTypeId
                ? matchInfo.hdp1 !== 0
                  ? -matchInfo.hdp1
                  : matchInfo.hdp2
                : matchInfo.hdp1 !== 0
                  ? matchInfo.hdp1
                  : -matchInfo.hdp1
            }

            if (matchInfo.hdp1 !== undefined && matchInfo.hdp2 == undefined) {
              updateFields.hdp_point = isMatchTypeId
                ? matchInfo.hdp1
                : isNegative
                  ? -matchInfo.hdp1
                  : matchInfo.hdp1

              updateFields.HDP = toPositiveNumber(matchInfo.hdp1)
            }

            if (matchInfo.hdp1 == undefined && matchInfo.hdp2 != undefined) {
              updateFields.hdp_point = isMatchTypeId
                ? matchInfo.hdp2
                : isNegative
                  ? -matchInfo.hdp2
                  : matchInfo.hdp2

              updateFields.HDP = toPositiveNumber(matchInfo.hdp2)
            }

            if (matchInfo.odds1a !== undefined) {
              updateFields.home_over = matchInfo.odds1a
            }

            if (matchInfo.odds2a !== undefined) {
              updateFields.away_under = matchInfo.odds2a
            }

            if (Object.keys(updateFields).length > 0) {
              Viva88Bet.update({ id: findTicket.id }, updateFields)
            }
          }

          if (records.length > 0) {
            insertRecords(records, Viva88Bet)
          }
        }

        if (Array.isArray(row) && row[1] === '-o') {
          Viva88Bet.delete({
            altLineId: row[3]
          })
        }

        if (Array.isArray(row) && row[1] === '-m') {
          EventViva88.delete({
            idEvent: row[3]
          })
        }
      }
    } catch (error) {
      console.log(error)
    }
  }
}

function insertRecords(records: any, Viva88Bet: Model) {
  Viva88Bet.insertMany(records)
  records.length = 0
}

function createReverseMap(obj: Record<string, number>): Record<number, string> {
  const reverse: Record<number, string> = {}
  for (const key in obj) {
    reverse[obj[key]] = key
  }
  return reverse
}
