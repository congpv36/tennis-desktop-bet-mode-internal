import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LoginCaptchaModalProps {
  loginID: string
  platformName: string
  image: string
  invalid: boolean
  submitting: boolean
  onSubmit: (captcha: string) => void
  onRefresh: () => void
  onClose: () => void
}

const CAPTCHA_MIN_LENGTH = 4
const CAPTCHA_MAX_LENGTH = 8

export default function LoginCaptchaModal({
  loginID,
  platformName,
  image,
  invalid,
  submitting,
  onSubmit,
  onRefresh,
  onClose
}: LoginCaptchaModalProps) {
  const { t } = useTranslation('layout')
  const [captcha, setCaptcha] = useState('')
  const [errorDismissed, setErrorDismissed] = useState(false)

  // a new image means a new token: clear the previous input
  useEffect(() => {
    setCaptcha('')
    setErrorDismissed(false)
  }, [image])

  const canVerify = captcha.length >= CAPTCHA_MIN_LENGTH && !submitting
  const displayError = !errorDismissed && invalid ? t('login_captcha_invalid') : ''

  const handleChange = (value: string) => {
    setCaptcha(value.replace(/[^0-9a-zA-Z]/g, '').slice(0, CAPTCHA_MAX_LENGTH))
    if (invalid) setErrorDismissed(true)
  }

  const handleVerify = () => {
    if (!canVerify) return
    onSubmit(captcha)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative rounded-2xl bg-white px-8 py-7 shadow-2xl min-w-[340px] max-w-[420px]">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 text-xl leading-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          ×
        </button>

        <div className="text-lg font-bold mb-1">{t('login_captcha_title')}</div>
        <div className="text-sm text-gray-500 mb-4">
          <Trans
            t={t}
            i18nKey="login_captcha_description"
            values={{ loginID, platformName }}
            components={{ b: <strong className="font-semibold text-gray-700" /> }}
          />
        </div>

        <div className="mb-4 flex items-center justify-center gap-3">
          <img
            src={image}
            alt="captcha"
            className="h-12 min-w-[120px] rounded border border-black/10 bg-white object-contain"
          />
          <Button
            variant="outline"
            className="border-black/20 text-black/80 hover:bg-white hover:border-black/40"
            disabled={submitting}
            onClick={onRefresh}
          >
            {t('login_captcha_refresh')}
          </Button>
        </div>

        <Input
          autoFocus
          maxLength={CAPTCHA_MAX_LENGTH}
          value={captcha}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleVerify()
          }}
          placeholder={t('login_captcha_placeholder')}
          error={displayError}
          className="text-center tracking-[0.5em] text-base font-semibold"
        />

        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-black/20 text-black/80 hover:bg-white hover:border-black/40"
            disabled={submitting}
            onClick={onClose}
          >
            {t('cancel')}
          </Button>
          <Button
            className="flex-1 inline-flex items-center justify-center gap-2"
            disabled={!canVerify}
            onClick={handleVerify}
          >
            {submitting && (
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {t('ps3838_verify')}
          </Button>
        </div>
      </div>
    </div>
  )
}
