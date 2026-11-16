import { MessagePort } from 'worker_threads'

import { Account } from '@db/model'

import { TARGET_TYPE } from '@shared/common/constants'
import { AccountType } from '@shared/common/types'

import { accountLogToFile } from '@/worker/lib/accountLogToFile'

export function getXsrfToken(cookieString) {
  const match = cookieString.match(/XSRF-TOKEN=([^;]+)/)
  return match ? match[1] : null
}

export async function handleLoginFail(port: MessagePort, account: AccountType, textLog: string) {
  port?.postMessage({
    data: Account.update(
      { id: account.id },
      {
        status: 'Exit',
        statusLogin: 'Fail',
        textLog
      }
    ),
    type: 'DataUpdateAccount'
  })

  await accountLogToFile(
    account.platformName,
    account.loginID,
    `Error: Access failed ${account.loginID}: ${textLog}`,
    'Program'
  )
}

export function buildHeaders(
  account: AccountType,
  overrides: Record<string, string> = {}
): Record<string, string> {
  const base = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language':
      'en-US,en;q=0.9,th;q=0.8,zh-CN;q=0.7,zh;q=0.6,ja;q=0.5,cs;q=0.4,zh-TW;q=0.3,ms;q=0.2',
    Connection: 'keep-alive',
    Origin: account.loginURL,
    Referer: account.loginURL,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
    'sec-ch-ua': '"Google Chrome";v="135.0", "Chromium";v="135.0", "Not.A/Brand";v="35"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    Cookie: account.cookie,
    ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
  }
  return { ...base, ...overrides }
}

export function getMatchMinute(periodStartTimeStr: string, period?: number): string {
  const periodStart = new Date(periodStartTimeStr)
  if (period === 5) {
    return `HT`
  }

  if (!period) {
    return ``
  }
  const nowUtc = new Date()

  const elapsedMs = nowUtc.getTime() - periodStart.getTime()

  if (elapsedMs < 0) return 'Trận chưa bắt đầu'

  const totalMinutes = Math.floor(elapsedMs / 60000)

  const minutes = totalMinutes % 60

  return `${period}H ${minutes}'`
}

export function getTargetType(marketType, marketGroupName) {
  if (
    marketType === 'Handicap' &&
    (!Array.isArray(marketGroupName) || marketGroupName.length === 0)
  ) {
    return TARGET_TYPE.SET
  }

  if (
    ['Handicap', 'OverUnder'].includes(marketType) &&
    Array.isArray(marketGroupName) &&
    marketGroupName.length > 0
  ) {
    const enItem = marketGroupName.find((item) => item.language === 'EN')
    if (!enItem) return null

    switch (enItem.value) {
      case 'Game Handicap':
        return TARGET_TYPE.GAME
      case 'First Set':
        return TARGET_TYPE.FIRST_SET
      case 'Second Set':
        return TARGET_TYPE.SECOND_SET
      default:
        return null
    }
  }

  return null
}

export function formatPlayerName(text: string) {
  const trimmed = text.trim()

  if (trimmed.includes('/')) {
    return trimmed
      .split('/')
      .map((name) => name.trim().toUpperCase())
      .join('/')
  }

  return trimmed.toUpperCase()
}

export function getDataPreset(gameType: string) {
  const map = {
    Early: { date: 'EarlyMarket', presetFilter: 'NonLive' },
    Running: { date: 'All', presetFilter: 'Live' },
    Today: { date: 'Today', presetFilter: 'NonLive' }
  }

  return map[gameType] || {}
}

export async function parseGraphQLResponse(response, queryType: string) {
  const data = await response.json()

  if (data.errors?.some((e) => e.extensions?.code === 'PERSISTED_QUERY_NOT_FOUND')) {
    return {
      error: Object.assign(new Error('PersistedQueryNotFound'), {
        queryType,
        type: 'PERSISTED_QUERY_NOT_FOUND'
      })
    }
  }

  return data
}

export async function checkCloudflare(res, account) {
  const contentType = res.headers.get('content-type')
  if (contentType && !contentType.includes('application/json')) {
    await accountLogToFile(account.platformName, account.loginID, `${await res.text()}`, 'Program')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err: any = new Error(
      'This IP has been blocked by Cloudflare. Please use a proxy, VPN, or try again later.'
    )
    err.code = 'CF_BLOCKED'
    throw err
  }
}
