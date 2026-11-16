import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'

import SelectMultipleModal from '@renderer/components/LeaguePointRandomizer/SelectMultipleModal'
import { LeaguePointRandomizerContext } from '@renderer/context/LeaguePointRandomizerContext'

const SelectMultiple = () => {
  const { t } = useTranslation('main')
  const context = useContext(LeaguePointRandomizerContext)
  const [showModal, setShowModal] = useState(false)

  if (!context) return null

  const { listSelectedLeague } = context

  const handleOpenModal = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  return (
    <>
      <button
        disabled={!listSelectedLeague?.length}
        onClick={handleOpenModal}
        className="
          absolute top-[5px] right-[5px] px-3 py-1.5
          bg-white border border-border-default rounded
           text-sm font-medium whitespace-nowrap
          transition-colors duration-200
          hover:border-green-color hover:bg-green-color hover:text-white
          disabled:opacity-50
          disabled:cursor-not-allowed
          disabled:hover:bg-white
          disabled:hover:border-border-default
          disabled:hover:text-text-default
        "
      >
        {t('select_multiple')}
      </button>

      {showModal && <SelectMultipleModal onClose={handleCloseModal} />}
    </>
  )
}

export default React.memo(SelectMultiple)
