import { Account } from '@db/model'

import { AccountType } from '@shared/common/types'

export const findValidAccount = (id: string): AccountType | null => {
  return Account.findOne({
    id,
    status: 'Logout',
    statusDelete: 0,
    statusPair: 1
  }) as AccountType | null
}
