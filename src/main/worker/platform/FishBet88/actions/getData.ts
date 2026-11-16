import fetch from 'node-fetch'

import { AccountType } from '@shared/common/types'

import { buildHeadersOdds } from '@/worker/platform/FishBet88/common/constants'
import {
  MatchesResponse_FishBet88,
  OddsRow_FishBet88
} from '@/worker/platform/FishBet88/common/types'
import { buildMatchesUrl, ProxyAgent_FishBet88 } from '@/worker/platform/FishBet88/helper'

const REQUEST_TIMEOUT_MS = 15_000

/**
 * API 1: every Tennis odds row of a market (one row per match and target: set handicap, game handicap,
 * first / second set), Malay odds. `matchId` limits the answer to one match.
 */
export const getMatchesFishBet88 = async (
  account: AccountType,
  marketId: number,
  proxyAgent: ProxyAgent_FishBet88,
  matchId?: number | string
): Promise<OddsRow_FishBet88[]> => {
  const url = buildMatchesUrl(marketId, matchId)
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeadersOdds(account),
    timeout: REQUEST_TIMEOUT_MS,
    ...(proxyAgent && { agent: proxyAgent })
  })

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} - ${url}`)

  const data = (await res.json()) as MatchesResponse_FishBet88
  return [
    ...(Array.isArray(data?.Matches) ? data.Matches : []),
    ...(Array.isArray(data?.RunningMatches) ? data.RunningMatches : [])
  ]
}

/** Live rows of one match (getTicket). */
export const getMatchDetailFishBet88 = (
  account: AccountType,
  matchId: number,
  marketId: number,
  proxyAgent: ProxyAgent_FishBet88
) => getMatchesFishBet88(account, marketId, proxyAgent, matchId)
