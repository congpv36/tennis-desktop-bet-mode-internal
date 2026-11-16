import { MessagePort } from 'worker_threads'

import { Account } from '@db/model'

import { AccountType } from '@shared/common/types'

import { accountLogToFile } from '@/worker/lib/accountLogToFile'

export async function handleLoginFail(port: MessagePort, account: AccountType, textLog: string) {
  port.postMessage({
    type: 'DataUpdateAccount',
    data: Account.update(
      { id: account.id },
      {
        status: 'Exit',
        statusLogin: 'Fail',
        textLog
      }
    )
  })
  await accountLogToFile(account.platformName, account.loginID, `${textLog}`, 'Program')
}
