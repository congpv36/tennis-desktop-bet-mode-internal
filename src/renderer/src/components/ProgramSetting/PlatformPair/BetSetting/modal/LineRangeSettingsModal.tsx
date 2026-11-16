import React, { Dispatch, SetStateAction, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'

import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { InputNumber } from '@renderer/components/ui/input-number'
import { Label } from '@renderer/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@renderer/components/ui/radio-group'
import { PlatformPairContext } from '@renderer/context/PlatformPairContext'
import { getHdpOptionsByLineKey } from '@renderer/lib/buildHdpOptions'
import { handleDataRange } from '@renderer/lib/handleDataRange'
import { updateObject } from '@renderer/lib/updateBetTo'

import { LineRangeData, RangeType } from '@shared/common/types'
import { CHECK_BOX_DETAIL_SETTING } from '@shared/renderer/constants'

const LineRangeSettingsModal = ({
  setShowAmountRounderSetting,
  typeSportBook,
  lineKey
}: {
  setShowAmountRounderSetting: Dispatch<SetStateAction<boolean>>
  typeSportBook: 'sportBook1' | 'sportBook2'
  lineKey: string
}) => {
  const { t } = useTranslation('main')

  const hdpOptions = React.useMemo(() => {
    return getHdpOptionsByLineKey(lineKey)
  }, [lineKey])

  const { Combination } = useContext(PlatformPairContext)
  const { currentPlatformPair, listPlatformPair, setListPlatformPair } = Combination

  const [isSaving, setIsSaving] = useState(false)

  const [dataBetTo, setDataBetTo] = useState(() => {
    if (lineKey && currentPlatformPair?.[typeSportBook]?.[`${lineKey}_Detail`]) {
      return currentPlatformPair[typeSportBook][`${lineKey}_Detail`]?.betTo || {}
    }
    const firstEnabledSetting = CHECK_BOX_DETAIL_SETTING.find(
      (item) => currentPlatformPair?.[typeSportBook]?.[item.key] === 1
    )
    return firstEnabledSetting
      ? currentPlatformPair[typeSportBook][`${firstEnabledSetting.key}_Detail`]?.betTo || {}
      : {}
  })

  const initializeLineRangeData = (): LineRangeData => {
    if (!currentPlatformPair?.[typeSportBook]) {
      return {
        betOnAllTypes: true,
        betOnSelectedTypes: false,
        gameTypes: {
          today: false,
          early: false,
          running: false
        },
        checkOdds: false,
        oddsFrom: 0.01,
        oddsTo: 0.01
      }
    }

    const rangeData = (() => {
      if (lineKey && currentPlatformPair?.[typeSportBook]?.[`${lineKey}_Detail`]) {
        return currentPlatformPair[typeSportBook][`${lineKey}_Detail`]?.range
      }
      const firstEnabledSetting = CHECK_BOX_DETAIL_SETTING.find(
        (item) => currentPlatformPair[typeSportBook][item.key] === 1
      )
      return firstEnabledSetting
        ? currentPlatformPair[typeSportBook][`${firstEnabledSetting.key}_Detail`]?.range
        : null
    })()

    const initialMinutesRanges =
      rangeData?.arrayMinutes?.map((item: { minutesFrom: string; minutesTo: string }) => ({
        id: uuidv4(),
        minutesFrom: item.minutesFrom || '',
        minutesTo: item.minutesTo || ''
      })) || []

    initialMinutesRanges.push({ id: uuidv4(), minutesFrom: '', minutesTo: '' })

    return {
      betOnAllTypes: rangeData?.betAll === 1,
      betOnSelectedTypes: rangeData?.betAll !== 1,
      checkOdds: rangeData?.checkOdd === 1 || false,
      gameTypes: {
        today: rangeData?.today === 1 || false,
        early: rangeData?.early === 1 || false,
        running: rangeData?.running === 1 || false
      },
      oddsFrom: parseFloat(rangeData?.oddFrom) || 0.01,
      oddsTo: parseFloat(rangeData?.oddTo) || 0.01
    }
  }

  const [lineRangeData, setLineRangeData] = useState<LineRangeData>(initializeLineRangeData)

  const updateHdp = (field: string, value: number) => {
    if (field === 'selectAll') {
      const newState = hdpOptions.reduce((acc, hdp) => {
        acc[hdp.key] = value
        return acc
      }, {})

      setDataBetTo({
        ...newState,
        selectAll: value
      })
    } else {
      const updatedData = { ...dataBetTo, [field]: value }
      const allSelected = hdpOptions.every((hdp) => updatedData[hdp.key])
      updatedData.selectAll = Number(allSelected)

      setDataBetTo(updatedData)
    }
  }

  const handleRangeTypeChange = (value: string) => {
    setLineRangeData((prev) => ({
      ...prev,
      betOnAllTypes: value === 'betOnAllTypes',
      betOnSelectedTypes: value === 'betOnSelectedTypes'
    }))
  }

  const handleGameTypeChange = (
    gameType: keyof typeof lineRangeData.gameTypes,
    checked: boolean
  ) => {
    setLineRangeData((prev) => ({
      ...prev,
      gameTypes: {
        ...prev.gameTypes,
        [gameType]: checked
      }
    }))
  }

  const handleCheckOdds = (checked: boolean) => {
    setLineRangeData((prev) => ({
      ...prev,
      checkOdds: checked
    }))
  }

  const handleOddsChange = (field: 'oddsFrom' | 'oddsTo', value: number) => {
    setLineRangeData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const updateAccountPairContext = (betToData, rangeData: RangeType) => {
    if (!currentPlatformPair || !lineKey) return false

    try {
      const updatedAccountPair = {
        ...currentPlatformPair,
        [typeSportBook]: {
          ...currentPlatformPair[typeSportBook],
          [`${lineKey}_Detail`]: {
            ...currentPlatformPair[typeSportBook][`${lineKey}_Detail`],
            range: rangeData,
            betTo: betToData,
            lastUpdated: Date.now()
          }
        }
      }

      const updatedList = listPlatformPair.map((pair) =>
        pair.id === currentPlatformPair.id ? updatedAccountPair : pair
      )

      setListPlatformPair(updatedList)
      return true
    } catch (error) {
      console.error('Error updating platform pair context:', error)
      return false
    }
  }

  const handleSave = async () => {
    if (!currentPlatformPair || !lineKey || isSaving) return

    setIsSaving(true)

    try {
      const rangeData: RangeType = {
        betAll: lineRangeData.betOnAllTypes ? 1 : 0,
        checkOdd: lineRangeData.checkOdds ? 1 : 0,
        early: lineRangeData.gameTypes.early ? 1 : 0,
        oddFrom: lineRangeData.oddsFrom.toString(),

        oddTo: lineRangeData.oddsTo.toString(),
        running: lineRangeData.gameTypes.running ? 1 : 0,
        today: lineRangeData.gameTypes.today ? 1 : 0
      }

      const dataRangeUpdate = handleDataRange(rangeData)

      updateObject(dataBetTo)

      const success = updateAccountPairContext(dataBetTo, dataRangeUpdate)

      if (success) {
        setShowAmountRounderSetting(false)
      } else {
        console.error('Failed to save changes')
      }
    } catch (error) {
      console.error('Error saving line range settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setShowAmountRounderSetting(false)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowAmountRounderSetting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white border border-border-default rounded-lg w-full max-h-[80vh] overflow-auto ${lineKey.includes('PK') ? 'min-w-[400px] max-w-[400px]' : 'min-w-5xl max-w-5xl'}`}
      >
        <div className="px-6 py-4 border-b border-border-default">
          <h2 className="font-semibold  flex items-center gap-2">
            {lineKey} - {lineKey.includes('PK') ? t('range_settings') : t('line_range_settings')} (
            {typeSportBook === 'sportBook1' ? t('sportbook_1') : t('sportbook_2')})
          </h2>
        </div>

        <div className={lineKey.includes('PK') ? 'block' : 'flex'}>
          {!lineKey.includes('PK') && (
            <div className="w-2/3 border-r border-border-default">
              <div className="py-2 pl-4 border-b border-border-default font-semibold">
                <label className="flex items-center">
                  <Checkbox
                    checked={Boolean(dataBetTo.selectAll)}
                    onCheckedChange={(checked) =>
                      updateHdp('selectAll', Number(checked as boolean))
                    }
                  />
                  <span className="ml-2  text-sm font-medium">{t('select_all')}</span>
                </label>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-8 gap-2">
                  {hdpOptions.map((hdp: { key: string; label: string }) => (
                    <label key={`${hdp.key}_${typeSportBook}`} className="inline-flex items-center">
                      <Checkbox
                        checked={Boolean(dataBetTo[hdp.key])}
                        onCheckedChange={(checked) =>
                          updateHdp(hdp.key, Number(checked as boolean))
                        }
                      />
                      <span
                        className={`ml-1 text-sm cursor-pointer ${
                          dataBetTo[hdp.key] === 1 ? ' font-medium' : ''
                        }`}
                      >
                        {hdp.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={lineKey.includes('PK') ? 'w-full' : 'w-2/5'}>
            <div className="p-2 border-b border-border-default  text-sm font-semibold ">
              {t('range_settings')}
            </div>
            <div className="p-4">
              <div className="flex items-center pb-4 border-b pt-2 border-border-default">
                <RadioGroup
                  value={lineRangeData.betOnAllTypes ? 'betOnAllTypes' : 'betOnSelectedTypes'}
                  onValueChange={handleRangeTypeChange}
                  className="flex justify-center w-full gap-5"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="betOnAllTypes" id="betOnAllTypes" />
                    <Label htmlFor="betOnAllTypes" className="font-medium ">
                      {t('bet_on_all')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="betOnSelectedTypes" id="betOnSelectedTypes" />
                    <Label htmlFor="betOnSelectedTypes" className="font-medium ">
                      {t('bet_on_selected')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center pt-5 pb-4">
                <div className="text-white text-sm">{t('game_type')}</div>
                <div className="flex gap-2 ml-14">
                  <label className="inline-flex items-center w-fit">
                    <Checkbox
                      checked={lineRangeData.gameTypes.running}
                      onCheckedChange={(checked) =>
                        handleGameTypeChange('running', checked as boolean)
                      }
                      disabled={lineRangeData.betOnAllTypes}
                    />
                    <span className="ml-1 text-sm">{t('running')}</span>
                  </label>
                  <label className="inline-flex items-center w-fit">
                    <Checkbox
                      checked={lineRangeData.gameTypes.today}
                      onCheckedChange={(checked) =>
                        handleGameTypeChange('today', checked as boolean)
                      }
                      disabled={lineRangeData.betOnAllTypes}
                    />
                    <span className="ml-1 text-sm">{t('today')}</span>
                  </label>
                  <label className="inline-flex items-center w-fit">
                    <Checkbox
                      checked={lineRangeData.gameTypes.early}
                      onCheckedChange={(checked) =>
                        handleGameTypeChange('early', checked as boolean)
                      }
                      disabled={lineRangeData.betOnAllTypes}
                    />
                    <span className="ml-1 text-sm">{t('early')}</span>
                  </label>
                </div>
              </div>

              <div className="flex py-3 gap-2">
                <label className="w-52 gap-1">
                  <div className="flex items-center">
                    <Checkbox checked={lineRangeData.checkOdds} onCheckedChange={handleCheckOdds} />
                    <span className="ml-1  text-sm">{t('check_odds')}</span>
                  </div>
                </label>
                <div>
                  <div className="pb-1  text-sm">{t('from_label')}</div>
                  <InputNumber
                    value={lineRangeData.oddsFrom}
                    onChange={(value) => handleOddsChange('oddsFrom', value)}
                    disabled={!lineRangeData.checkOdds}
                    precision={2}
                    step={0.01}
                    min={-1}
                    max={1}
                    className="w-full text-sm"
                  />
                </div>
                <div>
                  <div className="pb-1  text-sm">{t('to_label')}</div>
                  <InputNumber
                    value={lineRangeData.oddsTo}
                    onChange={(value) => handleOddsChange('oddsTo', value)}
                    disabled={!lineRangeData.checkOdds}
                    precision={2}
                    step={0.01}
                    min={-1}
                    max={1}
                    className="w-full text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border-default">
          <div className="flex justify-end py-3 px-4">
            <div className="gap-3 flex">
              <Button
                variant="outline"
                onClick={handleCancel}
                className=" border-border-default text-text-default hover:bg-transparent hover:border-gray-600  px-3 py-1.5 w-32"
                disabled={isSaving}
              >
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} className="text-white px-3 py-1 w-32">
                {t('save')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(LineRangeSettingsModal)
