import { HttpsProxyAgent } from 'https-proxy-agent'
import fetch from 'node-fetch'
import { v4 as uuidv4 } from 'uuid'

import { AccountType } from '@shared/common/types'
import { TicketInfoDataBetType } from '@shared/common/types'
import { OPTIONS_PROXY } from '@shared/main/constants'

import { buildTokenHeaders, DEBUG_X_APP_DATA, parseTokens, withDebugCookie } from '../helper'

import { accountLogToFile } from '@/worker/lib/accountLogToFile'
import { handleBetError, handleBetSuccess } from '@/worker/lib/handleLogBet'
import { isOddInRange } from '@/worker/lib/isOddInRange'
import { isProxyConfigValid } from '@/worker/lib/isProxyConfigValid'
import { buildHeadersPs3838 } from '@/worker/platform/Ps3838/common/contants'
import { BetResponse_Ps3838, TypeGetTickets_Ps3838 } from '@/worker/platform/Ps3838/common/types'

export const placeBet_Ps3838 = async (
  ticket: TicketInfoDataBetType,
  accountInfo: AccountType,
  dataGetTicketInfo: TypeGetTickets_Ps3838
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
      Data: {
        info: ticket.betRejectionReason,
        receiptID: '',
        receiptStatus: ''
      }
    }
  }

  if (ticket.checkOdd == 1) {
    if (!isOddInRange(ticket.oddFrom, ticket.oddTo, String(ticket.odd))) {
      await accountLogToFile(
        accountInfo.platformName,
        accountInfo.loginID,
        `Error: CheckOdd setting do not match.`,
        'BetList'
      )
      return {
        ErrorCode: 400,
        Data: {
          info: `Error: CheckOdd setting do not match.`,
          receiptID: '',
          receiptStatus: ''
        }
      }
    }
  }

  const {
    ErrorCode: ErrorCode_ProcessBet,
    Info,
    receiptID
  } = await bettingProcessBet__Ps3838(accountInfo, ticket, dataGetTicketInfo)

  return {
    ErrorCode: ErrorCode_ProcessBet, // 0: Success, 1: Fail, 2: Retry
    Data: {
      info: String(Info),
      receiptID: String(receiptID),
      receiptStatus: ErrorCode_ProcessBet == 0 ? 'Success' : 'Fail'
    }
  }
}

async function bettingProcessBet__Ps3838(
  accountInfo: AccountType,
  ticket: TicketInfoDataBetType,
  dataGetTicketInfo: TypeGetTickets_Ps3838
) {
  const { platformName, loginID, cookie } = accountInfo
  const tokens = parseTokens(accountInfo.token)

  try {
    const { status: statusProxyConfigValid, data } = isProxyConfigValid(accountInfo)
    const { newIpAddress, newPort, newUsername, newPassword } = data

    const proxyUrl =
      statusProxyConfigValid && accountInfo.proxyScope !== OPTIONS_PROXY.NONE
        ? `http://${newUsername}:${newPassword}@${newIpAddress}:${newPort}`
        : undefined

    const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined

    const stake = Number(ticket.betAmount_Standard)

    const body = JSON.stringify({
      oddsFormat: 4,
      acceptBetterOdds: false,
      selections: [
        {
          odds: dataGetTicketInfo.odds,
          oddsId: dataGetTicketInfo.oddsId,
          selectionId: dataGetTicketInfo.selectionId,
          stake: stake > (dataGetTicketInfo.maxStake ?? 0) ? dataGetTicketInfo.maxStake : stake,
          uniqueRequestId: uuidv4(),
          wagerType: 'NORMAL'
        }
      ]
    })

    await accountLogToFile(
      platformName,
      loginID,
      `Betting Info: ${ticket.bet}, ${ticket.targetType} ${ticket.type}@${ticket.bet.trim() == ticket.nameAway.trim() ? -Number(ticket.hdp_point) : ticket.hdp_point}, Odd: ${ticket.odd}`,
      'BetList'
    )
    await accountLogToFile(platformName, loginID, `Payload: ${body}`, 'BetList')

    const url = `${accountInfo.loginURL}/bet-placement/buyV4?uniqueRequestId=${uuidv4()}&locale=en_US&_=${Date.now()}&withCredentials=true`
    const resBetPlacement = await fetch(url, {
      method: 'POST',
      headers: {
        ...buildHeadersPs3838(accountInfo, accountInfo.vHucode),
        ...buildTokenHeaders(tokens),
        'x-app-data': DEBUG_X_APP_DATA,
        Cookie: withDebugCookie(cookie)
      },
      ...(proxyAgent && { agent: proxyAgent }),
      body
    })

    const dataBetPlacement: BetResponse_Ps3838 = await resBetPlacement.json()
    await accountLogToFile(
      platformName,
      loginID,
      `Response BET_PLACEMENT: ${JSON.stringify(dataBetPlacement)}`,
      'BetList'
    )

    const response = dataBetPlacement?.response || 'Unknown Error'
    if (!response || response.length === 0) {
      return await handleBetError(platformName, loginID, dataBetPlacement.errorMessage)
    }

    const status = response[0].status
    const wagerId = response[0].wagerId
    const errorCode = response[0]?.errorCode || 'Unknown Error'

    switch (status) {
      case 'ACCEPTED':
      case 'PENDING_ACCEPTANCE':
        return await handleBetSuccess(platformName, loginID, wagerId)
      case 'PROCESSED_WITH_ERROR':
        await accountLogToFile(
          platformName,
          loginID,
          `Status BET_PLACEMENT: FAIL (${errorCode})`,
          'BetList'
        )
        return { ErrorCode: 2, Info: errorCode, receiptID: wagerId }
      default:
        return await handleBetError(
          platformName,
          loginID,
          dataBetPlacement.errorMessage || 'Unknown Error'
        )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Ps3838 BET_PLACEMENT Fail:', errorMessage)
    return await handleBetError(platformName, loginID, `${errorMessage}`)
  }
}
