import { memo } from 'react'

import { GAME_TYPES } from '@shared/common/constants'

import { MarketBox } from './MarketBox'
import { MatchLine, MockAccountInfo, OddCell, OddModalInfo } from './types'

const MATCH_LINE_HEIGHT = 68

export const MatchDataRow = memo(function MatchDataRow({
  league,
  home,
  away,
  targetType,
  gameType,
  date,
  time,
  score,
  stat,
  markets,
  li,
  changedKeys,
  account,
  onOddClick
}: {
  league: string
  home: string
  away: string
  targetType: string
  gameType: string
  date: string
  time: string
  score: string
  stat: string
  markets: MatchLine[]
  li: number
  changedKeys: Set<string>
  account: MockAccountInfo | null
  onOddClick: (info: OddModalInfo) => void
}) {
  const ck = (mi: number, field: string) => changedKeys.has(`${li}_${mi}_${field}`)

  const mk =
    (marketType: 'HDP' | 'OU', half: 'Set' | 'Game', side: OddModalInfo['side'], cell: OddCell) =>
    () =>
      onOddClick({
        league,
        home,
        away,
        marketType,
        half,
        side,
        line: cell.line,
        hdp_point: cell.hdp_point,
        value: side === 'Home' || side === 'Over' ? cell.homeOdd : cell.awayOdd,
        homeOdd: cell.homeOdd,
        awayOdd: cell.awayOdd,
        meta: cell.meta,
        account: account ?? undefined
      })

  return (
    <div className="flex border-b" style={{ height: MATCH_LINE_HEIGHT * markets.length }}>
      <div className="w-[70px] shrink-0 border-r flex flex-col items-center justify-center text-center font-semibold">
        {gameType === GAME_TYPES.RUNNING ? (
          <>
            <div>{score}</div>
            <div className="text-red-700 text-xs">{stat}</div>
          </>
        ) : gameType === GAME_TYPES.TODAY ? (
          <>
            <div>{time}</div>
            <div className="text-red-700 text-xs">Live</div>
          </>
        ) : (
          <>
            <div className="text-red-700">{date}</div>
            <div className="text-gray-500 text-xs">{time}</div>
          </>
        )}
      </div>

      <div className="w-[780px] shrink-0 flex flex-col">
        {markets.map(({ mi, set, game }) => (
          <div
            key={mi}
            className="grid grid-cols-[300px_120px_120px_120px_120px]"
            style={{ height: MATCH_LINE_HEIGHT }}
          >
            <div className="pl-4 border-r flex flex-col justify-center">
              <div className="flex justify-between">
                <div
                  className={`${set.hdp.hdp_point < 0 ? 'text-orange-color' : 'text-blue-color'} font-medium`}
                >
                  {home}
                </div>
                <div className="mr-3 font-medium text-xs text-red-950">({targetType})</div>
              </div>
              <div
                className={`${set.hdp.hdp_point > 0 ? 'text-orange-color' : 'text-blue-color'} mt-2 font-medium`}
              >
                {away}
              </div>
            </div>

            <div className="p-2">
              <MarketBox
                homeOdd={set.hdp.homeOdd}
                line={set.hdp.line}
                awayOdd={set.hdp.awayOdd}
                hdp_point={set.hdp.hdp_point}
                changedHome={ck(mi, 'hdp_homeOdd')}
                changedAway={ck(mi, 'hdp_awayOdd')}
                onHomeClick={mk('HDP', 'Set', 'Home', set.hdp)}
                onAwayClick={mk('HDP', 'Set', 'Away', set.hdp)}
              />
            </div>

            <div className="p-2">
              <MarketBox
                homeOdd={set.ou.homeOdd}
                line={set.ou.line}
                awayOdd={set.ou.awayOdd}
                isOu
                changedHome={ck(mi, 'ou_homeOdd')}
                changedAway={ck(mi, 'ou_awayOdd')}
                onHomeClick={mk('OU', 'Set', 'Over', set.ou)}
                onAwayClick={mk('OU', 'Set', 'Under', set.ou)}
              />
            </div>

            <div className="p-2">
              {game?.hdp && (
                <MarketBox
                  homeOdd={game.hdp.homeOdd}
                  line={game.hdp.line}
                  awayOdd={game.hdp.awayOdd}
                  changedHome={false}
                  changedAway={false}
                  onHomeClick={mk('HDP', 'Game', 'Home', game.hdp)}
                  onAwayClick={mk('HDP', 'Game', 'Away', game.hdp)}
                />
              )}
            </div>

            <div className="p-2">
              {game?.ou && (
                <MarketBox
                  homeOdd={game.ou.homeOdd}
                  line={game.ou.line}
                  awayOdd={game.ou.awayOdd}
                  isOu
                  changedHome={false}
                  changedAway={false}
                  onHomeClick={mk('OU', 'Game', 'Over', game.ou)}
                  onAwayClick={mk('OU', 'Game', 'Under', game.ou)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
