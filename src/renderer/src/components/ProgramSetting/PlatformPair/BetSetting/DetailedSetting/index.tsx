import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@renderer/components/ui/checkbox'
import { Label } from '@renderer/components/ui/label'
import { PlatformPairContext } from '@renderer/context/PlatformPairContext'
import { getBetText } from '@renderer/lib/getBetText'

import { CHECK_BOX_DETAIL_SETTING } from '@shared/renderer/constants'

const DetailedSetting = ({ typeSportBook, handleShowPopupLineRange }) => {
  const { t } = useTranslation('main')
  const { Combination } = useContext(PlatformPairContext)
  const { listPlatformPair, setListPlatformPair, currentPlatformPair } = Combination

  const dataPlatformPair = useMemo(() => {
    return currentPlatformPair[typeSportBook] || {}
  }, [typeSportBook, currentPlatformPair])

  const isBetSelected = dataPlatformPair.generalSetting === 'BetSelected'

  const updateField = (field: string, value: number) => {
    const updatedList = listPlatformPair.map((item) => {
      if (item.id === currentPlatformPair.id) {
        return {
          ...item,
          [typeSportBook]: {
            ...item[typeSportBook],
            [field]: value
          }
        }
      }
      return item
    })
    setListPlatformPair(updatedList)
  }

  const updateCheckBox = (key: string, value: boolean) => {
    updateField(key, Number(value))
  }

  if (!currentPlatformPair || !dataPlatformPair) {
    return null
  }

  const handleLineRangeClick = (key: string) => {
    handleShowPopupLineRange(key, typeSportBook)
  }

  return (
    <div className="pt-4">
      <div className="text-sm font-semibold mt-3 mb-1 whitespace-nowrap overflow-hidden">
        {t('detailed_settings')}
      </div>
      <div className="grid grid-flow-col grid-rows-5 gap-x-2 pb-2 min-w-0 gap-2">
        {CHECK_BOX_DETAIL_SETTING.map(({ key, label }) => {
          const labelTextBetTo = getBetText(dataPlatformPair[`${key}_Detail`]?.betTo)

          return (
            <div key={key} className="flex items-center gap-2 min-w-0  ">
              <div className="flex gap-1 items-center min-w-0">
                <Checkbox
                  disabled={!isBetSelected}
                  id={`${key}_${typeSportBook}`}
                  checked={Boolean(dataPlatformPair[key])}
                  onCheckedChange={(checked) => updateCheckBox(key, checked as boolean)}
                />
                <Label
                  className="cursor-pointer text-xs font-semibold whitespace-nowrap"
                  htmlFor={`${key}_${typeSportBook}`}
                >
                  {label}
                </Label>
              </div>
              <div>
                <div>
                  <p
                    className={`${dataPlatformPair[key] === 1 ? 'block' : 'hidden'} cursor-pointer underline italic text-blue-color text-xs ${isBetSelected ? '' : 'opacity-50'}`}
                    onClick={() => isBetSelected && handleLineRangeClick(key)}
                  >
                    {key.includes('PK') ? '' : labelTextBetTo}
                  </p>
                </div>
                <div>
                  <p
                    className={`${dataPlatformPair[key] === 1 ? 'block' : 'hidden'} cursor-pointer text-end underline italic text-blue-color text-xs whitespace-nowrap overflow-hidden ${isBetSelected ? '' : 'opacity-50'}`}
                    onClick={() => isBetSelected && handleLineRangeClick(key)}
                  >
                    {dataPlatformPair[`${key}_Detail`]?.range.betAll === 1
                      ? t('range_all')
                      : t('range_custom')}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default React.memo(DetailedSetting)
