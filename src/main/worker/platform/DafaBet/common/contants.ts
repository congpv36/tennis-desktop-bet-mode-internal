export function getBaseUrl(loginURL: string) {
  return loginURL
    .trim()
    .replace(/^http:\/\//i, 'https://')
    .replace(/\/?$/, '/')
}

export const buildHeadersLogin = (account: { customIP?: string | null; loginURL: string }) => ({
  Accept: 'application/json, text/javascript',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  Origin: getBaseUrl(account.loginURL).replace(/\/$/, ''),
  Referer: `${getBaseUrl(account.loginURL)}en`,
  'X-Requested-With': 'XMLHttpRequest',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
})

export const buildHeadersBalance = (account: { customIP?: string | null; loginURL: string }) => ({
  Accept: 'application/json, text/javascript',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  Referer: `${getBaseUrl(account.loginURL)}en`,
  'X-Requested-With': 'XMLHttpRequest',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
})

export const buildHeadersCoupons = (account: { customIP?: string | null }) => ({
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'X-Sb-Brand': 'DAFABET',
  'X-Sb-Origin': 'WEB',
  'X-Sb-Portalid': '22',
  Referer: 'https://sports.dafabet.com/en/sports/239-TENN',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
})

// TODO: hash is tied to the current frontend build and may need to be refreshed later
export const EVENTS_API_HASH = 'f0b1342551a31e1063f924330519bbb7'
export const EVENTS_API_LOCALE = 'en-GB'

// Dafabet's sentinel for "no value" on numeric fields (e.g. outcome.extraKey2 when there is no split line)
export const NO_VALUE_DAFABET = -1234567890000000000

export const buildHeadersEvents = (account: { customIP?: string | null }) => ({
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'X-Sb-Brand': 'DAFABET',
  'X-Sb-Origin': 'WEB',
  'X-Sb-Portalid': '22',
  'X-Accept-Language': EVENTS_API_LOCALE,
  Origin: 'https://sports.dafabet.com',
  Referer: 'https://sports.dafabet.com/en/sports/239-TENN',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
})

export const buildHeadersLiveEvents = (account: { customIP?: string | null }) => ({
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'X-Sb-Brand': 'DAFABET',
  'X-Sb-Origin': 'WEB',
  'X-Sb-Portalid': '22',
  'X-Accept-Language': EVENTS_API_LOCALE,
  Referer: 'https://sports.dafabet.com/en/live/sport/239-TENN',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
})

export const buildHeadersEventDetail = (
  account: { customIP?: string | null },
  event: { id: number; slug?: string },
  isRunning = false
) => ({
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'X-Sb-Brand': 'DAFABET',
  'X-Sb-Origin': 'WEB',
  'X-Sb-Portalid': '22',
  'X-Accept-Language': EVENTS_API_LOCALE,
  Referer: isRunning
    ? `https://sports.dafabet.com/en/live/${event.slug ?? event.id}?backTo=%2Fen%2Flive%2Fsport%2F239-TENN`
    : `https://sports.dafabet.com/en/events/${event.slug ?? event.id}?backTo=%2Fen%2Fsports%2F239-TENN`,
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
})

export const buildHeadersBetslip = (account: { customIP?: string | null }, token: string) => ({
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'X-Lvs-Priceformat': 'MALAY',
  'X-Sb-Brand': 'DAFABET',
  'X-Sb-Origin': 'WEB',
  'X-Sb-Portalid': '22',
  'X-Accept-Language': EVENTS_API_LOCALE,
  Origin: 'https://sports.dafabet.com',
  Referer: 'https://sports.dafabet.com/en/sports/239-TENN',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
})

export const buildHeadersCheckPlayer = (account: { customIP?: string | null }, token: string) => ({
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Authorization: `Bearer ${token}`,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'X-Sb-Brand': 'DAFABET',
  'X-Sb-Origin': 'WEB',
  'X-Sb-Portalid': '22',
  'X-Accept-Language': EVENTS_API_LOCALE,
  Referer: 'https://sports.dafabet.com/en/sports/239-TENN',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  ...(account.customIP ? { 'X-Forwarded-For': account.customIP } : {})
})
