/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpsProxyAgent } from 'https-proxy-agent'

import { TARGET_TYPE } from '@shared/common/constants'
import { AccountType } from '@shared/common/types'
import { OPTIONS_PROXY } from '@shared/main/constants'

import { isProxyConfigValid } from '@/worker/lib/isProxyConfigValid'

export const DEBUG_EXTRA_COOKIE =
  '_sig=Rcy1OVEV5TURNeFkyRXdZbUUyTURRMFl3OjNxYXB4NDFmSEFaNjJ5Q2JwUUFITlVGZEs6LTEzMjQzMzExODc6Nzg4OTQ0MzgxOjIuMTMuMDo5Q0NFQTlvSVhE; _apt=9CCEA9oIXD; pctag=dc821180-c6c2-4fe5-adaa-5fd0e6fcce72; _ulp=aEJSR05ZdTBuUjZxYldBTUhPQm0wZzFPcXdVbnd5dnhDZ3cwa040QUtlKzc1eHpJMlJOYUx3TG5FZitRcGdrcWJmbk5GWkltSDNQWEJPVkVDR0Npd3c9PXwyOTA2N2ZjNTRkNTk0ZDZlMWEzMzQzOTNiMjkxNDMyMA==; uoc=be97830afef253f33d2a502d243b8c37; dpAOW=q9pmurY_jhI_X; user_trusted_allowed=true'

export const DEBUG_X_APP_DATA =
  'pctag=dc821180-c6c2-4fe5-adaa-5fd0e6fcce72;directusToken=TwEdnphtyxsfMpXoJkCkWaPsL2KJJ3lo;dpAOW=q9pmurY_jhI_X;PCTR=1947892360659;BrowserSessionId=d9f0e896-e47e-4d4e-97b6-1f039471f381;_og=QQ%3D%3D;_ulp=aEJSR05ZdTBuUjZxYldBTUhPQm0wZzFPcXdVbnd5dnhDZ3cwa040QUtlKzc1eHpJMlJOYUx3TG5FZitRcGdrcWJmbk5GWkltSDNQWEJPVkVDR0Npd3c9PXwyOTA2N2ZjNTRkNTk0ZDZlMWEzMzQzOTNiMjkxNDMyMA%3D%3D;custid=id%3DBCB3700234%26login%3D202609222112%26roundTrip%3D202609222112%26hash%3DEFC4ACC5032C87A1935C2F3CD3F6E970;_userDefaultView=COMPACT;__prefs=W251bGwsNCwxLDAsMSxudWxsLGZhbHNlLDAuMDAwMCxmYWxzZSx0cnVlLCJfM0xJTkVTIiwtMSxudWxsLHRydWUsdHJ1ZSxmYWxzZSxmYWxzZSxudWxsLG51bGwsdHJ1ZSwiU01BTEwiLDEsdHJ1ZV0%3D;lang=en_US'

export function buildProxyAgent(account: AccountType): {
  status: boolean
  proxyAgent: HttpsProxyAgent<string> | undefined
} {
  const { status, data } = isProxyConfigValid(account)
  const { newIpAddress, newPort, newUsername, newPassword } = data

  const proxyUrl =
    status && account.proxyScope !== OPTIONS_PROXY.NONE
      ? `http://${newUsername}:${newPassword}@${newIpAddress}:${newPort}`
      : undefined

  return { status, proxyAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined }
}

export function parseTokens(token?: string | null): Record<string, string> {
  try {
    return token ? JSON.parse(token) : {}
  } catch {
    return {}
  }
}

export function buildTokenHeaders(tokens: Record<string, string>) {
  return {
    'X-Browser-Session-Id': tokens['X-Browser-Session-Id'],
    'X-Custid': tokens['X-Custid'],
    'X-U': tokens['X-U'],
    'X-Slid': tokens['X-SLID'],
    'X-Lcu': tokens['X-Lcu']
  }
}

export function withDebugCookie(cookie?: string | null): string {
  return cookie ? `${cookie}; ${DEBUG_EXTRA_COOKIE}` : DEBUG_EXTRA_COOKIE
}

export function buildPlatformUrl(account: AccountType, type: string) {
  const timestamp = Date.now()
  const url = account.loginURL

  const urlMap = {
    AUTH: `${url}member-auth/v2/auth?locale=en_US&_=${timestamp}&withCredentials=true`,
    VERIFY_OTP: `${url}member-auth/v2/verify-otp?locale=en_US&_=${timestamp}&withCredentials=true`,
    BALANCE: `${url}member-service/v2/account-balance?locale=en_US&_=${timestamp}&withCredentials=true`,
    KEEP_ALIVE: `${url}member-auth/v2/keep-alive?locale=en_US&_=${timestamp}&withCredentials=true`,
    MULTI_TICKET: `${url}member-betslip/v2/all-odds-selections?locale=en_US&_=${timestamp}&withCredentials=true`
  }

  return urlMap[type] ?? url
}

export function extractCookie(setCookieHeader: string | null): string {
  if (!setCookieHeader) return ''
  return setCookieHeader
    .split(',')
    .map((c) => c.split(';')[0])
    .join('; ')
}

export function checkGames(home: string, away: string) {
  const endsWithGames = (str: string) => str.trim().endsWith('(Games)')

  const hasGames = endsWithGames(home) && endsWithGames(away)

  if (hasGames) {
    return {
      away: away.replace(/\s*\(Games\)$/, '').trim(),
      home: home.replace(/\s*\(Games\)$/, '').trim(),
      result: true
    }
  }

  return { away, home, result: false }
}

export function removeGames(text: string) {
  return text.replace(/\s*\(Games\)\s*/g, '').trim()
}

export function getCodeByTarget(
  targetType: string,
  specialOdd: number | null,
  typeOdd: string,
  bet: string,
  nameHome: string
) {
  if (specialOdd == null) return null

  const prefixMap = {
    [TARGET_TYPE.SET]: '0',
    [TARGET_TYPE.GAME]: '0',
    [TARGET_TYPE.FIRST_SET]: '1',
    [TARGET_TYPE.SECOND_SET]: '1'
  }

  const prefix = prefixMap[targetType]
  if (!prefix) return null

  // ---- SPREAD ----
  if (typeOdd === 'SPREAD') {
    if (specialOdd === 1) {
      // case 1 & 2
      return bet === nameHome ? `${prefix}|2|0|1` : `${prefix}|2|1|1`
    } else {
      // case 3 & 4
      return bet === nameHome ? `${prefix}|2|0|0` : `${prefix}|2|1|0`
    }
  }

  // ---- OTHER typeOdd ----
  if (specialOdd === 1) {
    // case 5 & 6
    return bet === 'Over' ? `${prefix}|3|3|1` : `${prefix}|3|4|1`
  } else {
    // case 7 & 8
    return bet === 'Over' ? `${prefix}|3|3|0` : `${prefix}|3|4|0`
  }
}

export function parseLoginResponse(raw: string): {
  status: 'success' | 'expired' | 'fail' | 'blocked' | 'unknown'
  message: string
  retryAfter?: number
} {
  let parsed: any

  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = raw.trim()
  }

  if (typeof parsed === 'object' && parsed !== null && 'code' in parsed) {
    const { code, tokens } = parsed

    if ((code === 1 || code == 3) && tokens) {
      return { status: 'success', message: 'Login success' }
    }

    if (code === 2 && tokens) {
      return {
        status: 'expired',
        message: 'Account password has expired. Please update it on website.'
      }
    }

    if (code === -1) {
      return { status: 'fail', message: 'Login failed. Please contact Customer Service Support.' }
    }

    if (code === 0) {
      return { status: 'fail', message: 'Invalid loginId or password' }
    }
  }

  if (parsed === -1) {
    return { status: 'fail', message: 'Login failed. Please contact Customer Service Support.' }
  }

  if (parsed === 0) {
    return { status: 'fail', message: 'Invalid loginId or password' }
  }

  if (typeof parsed === 'string' && parsed.includes('Cloudflare')) {
    return { status: 'blocked', message: 'Blocked by Cloudflare (Error 1015)' }
  }

  if (parsed && parsed.status === 429 && parsed.error_code === 1015) {
    const retryAfter = parsed.retry_after || 30
    const message = `Rate-limited by Cloudflare. Please wait for ${retryAfter} seconds before retrying.`

    console.error(message)

    return {
      status: 'blocked',
      message: message,
      retryAfter
    }
  }

  return { status: 'unknown', message: 'Unknown response format' }
}
