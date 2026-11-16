import { HttpsProxyAgent } from 'https-proxy-agent'
import fetch from 'node-fetch'

import { TicketInfoDataBetType } from '@shared/common/types'
import { AccountType } from '@shared/common/types'

import { accountLogToFile } from '@/worker/lib/accountLogToFile'
import { isProxyConfigValid } from '@/worker/lib/isProxyConfigValid'
import { SetDataResponse, UserInfoResponse } from '@/worker/platform/3In1bet/common/types'
import { buildPlatformUrl_3In1Bet } from '@/worker/platform/3In1bet/helper'

export const getTicket_3in1Bet = async (
  accountInfo: AccountType,
  ticket: TicketInfoDataBetType
) => {
  if (!ticket.isBetAllowed) {
    await accountLogToFile(
      accountInfo.platformName,
      accountInfo.loginID,
      ticket.betRejectionReason,
      'BetList'
    )
    return {
      ErrorCode: 400,
      HDP: ticket.HDP,
      Hdp_point: ticket.hdp_point,
      Message: 'No Bet By User',
      Odds: ticket.odd || 0,
      Data: null,
      OldsOdd: ticket.odd,
      Min: 0,
      Max: 0
    }
  }
  await accountLogToFile(accountInfo.platformName, accountInfo.loginID, '', 'BetList')
  await accountLogToFile(
    accountInfo.platformName,
    accountInfo.loginID,
    `------------------------------------------------------------------------------------------------------------------------------------------`,
    'BetList'
  )
  await accountLogToFile(
    accountInfo.platformName,
    accountInfo.loginID,
    `--------------------[[${`GameType ${ticket.gameType}`}] ${ticket.nameHome} -vs- ${ticket.nameAway}: Bet ${ticket.bet}, ${ticket.targetType} ${ticket.type}@${ticket.bet.trim() == ticket.nameAway.trim() ? -Number(ticket.hdp_point) : ticket.hdp_point}, Odd: ${ticket.odd} ]--------------------`,
    'BetList'
  )
  await accountLogToFile(accountInfo.platformName, accountInfo.loginID, '', 'BetList')

  try {
    const { status, data } = isProxyConfigValid(accountInfo)

    const { newIpAddress, newPort, newUsername, newPassword } = data
    const proxyUrl =
      status && accountInfo.proxyScope !== 'None'
        ? `http://${newUsername}:${newPassword}@${newIpAddress}:${newPort}`
        : undefined

    const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined
    const idEvent = ticket.idEvent
    const odd = Math.abs(Number(ticket.hdp_point))
    const priceOdd = ticket.odd

    const { bet, nameHome } = ticket
    const typeBet = ['Over', 'Under'].includes(bet) ? bet : 'Hdp'
    const type = bet === nameHome || bet === 'Over' ? 'Home' : 'Away'
    const typeOdd = 'MY'
    const isHomeStrong = ticket.isHomeStrong //1-đội nhà mạnh   0-đội nhà yếu case odd==0? vị trí
    const typeTime = ticket.gameType
    //0,0,0
    const uuidLeague = ticket.uuidLeague
    const number = 0
    //0,0
    const code = Math.random()
    const [homeScore, awayScore] = ticket.score ? ticket.score.split('-').map(Number) : [0, 0]

    const dataPayload = [
      idEvent,
      priceOdd,
      typeBet,
      type,
      typeOdd,
      isHomeStrong,
      odd,
      typeTime,
      homeScore,
      awayScore,
      0,
      uuidLeague,
      number,
      0,
      code
    ].join(',')

    const body = JSON.stringify({
      bo: '0',
      cb: 0,
      data: dataPayload,
      isAuto: true,
      s: '0'
    })

    const [userInfoRes, setDataRes] = await Promise.all([
      fetch(buildPlatformUrl_3In1Bet(accountInfo, 'USER_INFO_PANEL_HOST'), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Cookie: accountInfo.cookie,
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          ...(accountInfo.customIP ? { 'X-Forwarded-For': accountInfo.customIP } : {})
        },
        method: 'POST',
        ...(proxyAgent && { agent: proxyAgent })
      }),
      fetch(buildPlatformUrl_3In1Bet(accountInfo, 'SET_DATA'), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Cookie: accountInfo.cookie,
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          ...(accountInfo.customIP ? { 'X-Forwarded-For': accountInfo.customIP } : {})
        },
        method: 'POST',
        ...(proxyAgent && { agent: proxyAgent }),
        body
      })
    ])
    const userInfo = (await userInfoRes.json()) as UserInfoResponse
    const betCredit = Number(userInfo.BetCredit)

    const betAmount = ticket.betAmount_Standard

    if (betAmount != '' && +betAmount > betCredit) {
      await accountLogToFile(
        accountInfo.platformName,
        accountInfo.loginID,
        `Error: Credit currently [${betCredit}] less than bet amount setting [${betAmount}]`,
        'BetList'
      )

      return {
        ErrorCode: 1,
        HDP: ticket.HDP,
        Hdp_point: ticket.hdp_point,
        Message: `Error: Credit currently [${betCredit}] less than bet amount setting [${betAmount}]`,
        Odds: ticket.odd || 0,
        Data: null,
        OldsOdd: ticket.odd,
        Min: 0,
        Max: 0
      }
    }
    await accountLogToFile(
      accountInfo.platformName,
      accountInfo.loginID,
      `Payload: ${body}`,
      'BetList'
    )
    const setData = (await setDataRes.json()) as SetDataResponse

    await accountLogToFile(
      accountInfo.platformName,
      accountInfo.loginID,
      `Response Ticket: ${JSON.stringify(setData)}`,
      'BetList'
    )

    const statusCode = setData.d.StatusCode
    const min = setData.d.Min
    const max = setData.d.Max

    if (statusCode !== 0 && statusCode !== 3) {
      throw new Error(setData.d.Message || 'Unknown Error')
    }

    if (betAmount != '' && +betAmount < min) {
      await accountLogToFile(
        accountInfo.platformName,
        accountInfo.loginID,
        `Error: Bet Amount [${betAmount}] less than Min Bet [${min}]`,
        'BetList'
      )

      return {
        ErrorCode: 1,
        HDP: ticket.HDP,
        Hdp_point: ticket.hdp_point,
        Message: `Error: Bet Amount [${betAmount}] less than Min Bet [${min}]`,
        Odds: ticket.odd || 0,
        Data: null,
        OldsOdd: ticket.odd,
        Min: 0,
        Max: 0
      }
    }

    if (betAmount != '' && +betAmount > max) {
      await accountLogToFile(
        accountInfo.platformName,
        accountInfo.loginID,
        `Error: Bet Amount [${betAmount}] more than Max Bet [${max}]`,
        'BetList'
      )

      return {
        ErrorCode: 1,
        HDP: ticket.HDP,
        Hdp_point: ticket.hdp_point,
        Message: `Error: Bet Amount [${betAmount}] more than Max Bet [${max}]`,
        Odds: ticket.odd || 0,
        Data: null,
        OldsOdd: ticket.odd,
        Min: 0,
        Max: 0
      }
    }

    return {
      ErrorCode: 0,
      HDP: ticket.HDP,
      Hdp_point: ticket.hdp_point,
      Message: statusCode == 3 ? 'ODDS_CHANGE' : 'OK',
      Odds: setData.d.Odds,
      Data: setData,
      OldsOdd: ticket.odd,
      Min: min,
      Max: max
    }
  } catch (error) {
    console.log(
      'Fetch 3in1Bet Get Ticket Fail:',
      error instanceof Error ? error.message : String(error)
    )

    await accountLogToFile(
      accountInfo.platformName,
      accountInfo.loginID,
      `Get Ticket Fail: ${error instanceof Error ? error.message : String(error)}`,
      'BetList'
    )
    return {
      ErrorCode: 1,
      HDP: ticket.HDP,
      Hdp_point: ticket.hdp_point,
      Message: `Error: Get Ticket Fail ${error instanceof Error ? error.message : 'Unknown Error'}`,
      Odds: ticket.odd || 0,
      Data: null,
      OldsOdd: ticket.odd,
      Min: 0,
      Max: 0
    }
  }
}
