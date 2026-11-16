import { TARGET_TYPE } from '@shared/common/constants'
import {
  DataCrawlType,
  ShowOddsLeagueEntry,
  ShowOddsMarketRow,
  ShowOddsResult
} from '@shared/common/types'

type PrevRawEntry = { home_over: number; away_under: number }
type Position = { li: number; mi: number }

const prevRawByPlatform = new Map<string, Map<number, PrevRawEntry>>()
const positionMapByPlatform = new Map<string, Map<string, Position>>()

function positionKey(eventId: number, targetType: string): string {
  const group = targetType === TARGET_TYPE.GAME ? TARGET_TYPE.SET : targetType
  return `${eventId}::${group}`
}

const SPLIT_TARGET_TYPES = [TARGET_TYPE.FIRST_SET, TARGET_TYPE.SECOND_SET]

function transformRawData(rawData: DataCrawlType[]): {
  entries: ShowOddsLeagueEntry[]
  positionMap: Map<string, Position>
} {
  const positionMap = new Map<string, Position>()

  type MatchData = {
    home: string
    away: string
    league: string
    gameType: string
    date: string
    time: string
    score: string
    stat: string
    eventOrder: number[]
    eventMap: Map<number, DataCrawlType[]>
  }
  const leagueOrder: string[] = []
  const leagueMap = new Map<string, { matchOrder: string[]; matchMap: Map<string, MatchData> }>()

  for (const row of rawData) {
    const leagueKey = row.uuidLeague ?? row.nameLeague
    if (!leagueMap.has(leagueKey)) {
      leagueMap.set(leagueKey, { matchOrder: [], matchMap: new Map() })
      leagueOrder.push(leagueKey)
    }
    const leagueData = leagueMap.get(leagueKey)!
    const matchKey = `${row.nameHome}__${row.nameAway}`
    if (!leagueData.matchMap.has(matchKey)) {
      leagueData.matchMap.set(matchKey, {
        home: row.nameHome,
        away: row.nameAway,
        league: row.nameLeague,
        gameType: row.gameType,
        date: row.date,
        time: row.time,
        score: row.score,
        stat: row.stat,
        eventOrder: [],
        eventMap: new Map()
      })
      leagueData.matchOrder.push(matchKey)
    }
    const matchData = leagueData.matchMap.get(matchKey)!
    if (!matchData.eventMap.has(row.idEvent)) {
      matchData.eventMap.set(row.idEvent, [])
      matchData.eventOrder.push(row.idEvent)
    }
    matchData.eventMap.get(row.idEvent)!.push(row)
  }

  const entries: ShowOddsLeagueEntry[] = []
  let li = 0

  for (const leagueKey of leagueOrder) {
    const { matchOrder, matchMap } = leagueMap.get(leagueKey)!
    for (const matchKey of matchOrder) {
      const { home, away, league, gameType, date, time, score, stat, eventOrder, eventMap } =
        matchMap.get(matchKey)!
      const mainMarkets: ShowOddsMarketRow[] = []
      const mainEventIds: number[] = []
      const splitGroups = new Map<string, { markets: ShowOddsMarketRow[]; eventIds: number[] }>()

      for (const eventId of eventOrder) {
        const rows = eventMap.get(eventId)!

        const hdpMatchRows = rows.filter(
          (r) => r.type === 'HDP' && r.targetType === TARGET_TYPE.SET
        )
        const ouMatchRows = rows.filter((r) => r.type === 'OU' && r.targetType === TARGET_TYPE.SET)
        const hdpHalfRows = rows.filter(
          (r) => r.type === 'HDP' && r.targetType === TARGET_TYPE.GAME
        )
        const ouHalfRows = rows.filter((r) => r.type === 'OU' && r.targetType === TARGET_TYPE.GAME)

        if (hdpMatchRows.length || ouMatchRows.length || hdpHalfRows.length || ouHalfRows.length) {
          const numLines =
            Math.max(
              hdpMatchRows.length,
              ouMatchRows.length,
              hdpHalfRows.length,
              ouHalfRows.length
            ) || 1

          for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
            const hdpMatch = hdpMatchRows[lineIdx] ?? null
            const ouMatch = ouMatchRows[lineIdx] ?? null
            const hdpHalf = hdpHalfRows[lineIdx] ?? null
            const ouHalf = ouHalfRows[lineIdx] ?? null

            const anyRow = hdpMatch ?? ouMatch ?? hdpHalfRows[0] ?? ouHalfRows[0]!

            const market: ShowOddsMarketRow = {
              set: {
                hdp: hdpMatch
                  ? {
                      homeOdd: hdpMatch.home_over,
                      line: hdpMatch.HDP,
                      awayOdd: hdpMatch.away_under,
                      hdp_point: hdpMatch.hdp_point,
                      meta: hdpMatch
                    }
                  : { homeOdd: 0, line: '-', awayOdd: 0, hdp_point: 0, meta: anyRow },
                ou: ouMatch
                  ? {
                      homeOdd: ouMatch.home_over,
                      line: ouMatch.HDP,
                      awayOdd: ouMatch.away_under,
                      hdp_point: ouMatch.hdp_point,
                      meta: ouMatch
                    }
                  : { homeOdd: 0, line: '-', awayOdd: 0, hdp_point: 0, meta: anyRow }
              }
            }

            if (hdpHalf || ouHalf) {
              market.game = {
                hdp: hdpHalf
                  ? {
                      homeOdd: hdpHalf.home_over,
                      line: hdpHalf.HDP,
                      awayOdd: hdpHalf.away_under,
                      hdp_point: hdpHalf.hdp_point,
                      meta: hdpHalf
                    }
                  : undefined,
                ou: ouHalf
                  ? {
                      homeOdd: ouHalf.home_over,
                      line: ouHalf.HDP,
                      awayOdd: ouHalf.away_under,
                      hdp_point: ouHalf.hdp_point,
                      meta: ouHalf
                    }
                  : undefined
              }
            }

            mainMarkets.push(market)
            mainEventIds.push(eventId)
          }
        }

        for (const targetType of SPLIT_TARGET_TYPES) {
          const hdpRows = rows.filter((r) => r.type === 'HDP' && r.targetType === targetType)
          const ouRows = rows.filter((r) => r.type === 'OU' && r.targetType === targetType)
          if (!hdpRows.length && !ouRows.length) continue

          if (!splitGroups.has(targetType)) {
            splitGroups.set(targetType, { markets: [], eventIds: [] })
          }
          const group = splitGroups.get(targetType)!

          const numLines = Math.max(hdpRows.length, ouRows.length) || 1

          for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
            const hdp = hdpRows[lineIdx] ?? null
            const ou = ouRows[lineIdx] ?? null
            const anyRow = hdp ?? ou!

            group.markets.push({
              set: {
                hdp: hdp
                  ? {
                      homeOdd: hdp.home_over,
                      line: hdp.HDP,
                      awayOdd: hdp.away_under,
                      hdp_point: hdp.hdp_point,
                      meta: hdp
                    }
                  : { homeOdd: 0, line: '-', awayOdd: 0, hdp_point: 0, meta: anyRow },
                ou: ou
                  ? {
                      homeOdd: ou.home_over,
                      line: ou.HDP,
                      awayOdd: ou.away_under,
                      hdp_point: ou.hdp_point,
                      meta: ou
                    }
                  : { homeOdd: 0, line: '-', awayOdd: 0, hdp_point: 0, meta: anyRow }
              }
            })
            group.eventIds.push(eventId)
          }
        }
      }

      if (mainMarkets.length > 0) {
        mainMarkets.forEach((_, mi) => {
          positionMap.set(positionKey(mainEventIds[mi], TARGET_TYPE.SET), { li, mi })
        })
        entries.push({
          league,
          home,
          away,
          gameType,
          date,
          time,
          score,
          stat,
          targetType: TARGET_TYPE.SET,
          markets: mainMarkets
        })
        li++
      }

      for (const targetType of SPLIT_TARGET_TYPES) {
        const group = splitGroups.get(targetType)
        if (!group || group.markets.length === 0) continue

        group.markets.forEach((_, mi) => {
          positionMap.set(positionKey(group.eventIds[mi], targetType), { li, mi })
        })
        entries.push({
          league,
          home,
          away,
          gameType,
          date,
          time,
          score,
          stat,
          targetType,
          markets: group.markets
        })
        li++
      }
    }
  }

  return { entries, positionMap }
}

export function processShowOdds(rawData: DataCrawlType[], platform: string): ShowOddsResult {
  if (!rawData.length) return { data: [], changedKeys: [] }

  const prevRaw = prevRawByPlatform.get(platform) ?? new Map<number, PrevRawEntry>()
  const prevPositionMap = positionMapByPlatform.get(platform) ?? new Map<string, Position>()

  const changedKeys: string[] = []
  for (const row of rawData) {
    const prev = prevRaw.get(row.id)
    if (prev) {
      const pos = prevPositionMap.get(positionKey(row.idEvent, row.targetType))
      if (pos) {
        const prefix = row.type.toLowerCase() as 'hdp' | 'ou'
        if (prev.home_over !== row.home_over) {
          changedKeys.push(`${pos.li}_${pos.mi}_${prefix}_homeOdd`)
        }
        if (prev.away_under !== row.away_under) {
          changedKeys.push(`${pos.li}_${pos.mi}_${prefix}_awayOdd`)
        }
      }
    }
  }

  const { entries, positionMap } = transformRawData(rawData)

  prevRawByPlatform.set(
    platform,
    new Map(rawData.map((r) => [r.id, { home_over: r.home_over, away_under: r.away_under }]))
  )
  positionMapByPlatform.set(platform, positionMap)

  return { data: entries, changedKeys }
}
