import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useLogin } from './LoginContext'
import { useAuth } from '../../contexts/AuthContext'
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate'
import { authService } from '../../services/authService'
import { supabase } from '../../lib/supabase'

type LoginFormProps = {
  onClose: () => void
}

type LoginMethod = 'email' | 'phone'

export default function LoginForm({ onClose }: LoginFormProps) {
  const { isRegister, setIsRegister } = useLogin()
  const { signIn } = useAuth()
  const navigate = useLocalizedNavigate()
  const { t } = useTranslation('auth')
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)

      setTimeout(() => {
        onClose()
        navigate('/dashboard')
      }, 100)
    } catch (err: any) {
      setIsSuccess(false)
      setError(err.message || t('loginForm.loginFailed'))
      setLoading(false)
    }
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!showOtpInput) {
        await authService.loginWithPhone(phone)
        setShowOtpInput(true)
        setLoading(false)
      } else {
        const verified = await authService.verifyPhoneLogin(phone, otpCode)

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('phone', phone)
          .eq('phone_verified', true)
          .maybeSingle()

        if (profile) {
          const { data: session, error } = await supabase.auth.signInWithPassword({
            email: profile.id + '@phone.doktochain.com',
            password: phone,
          })

          if (error) throw error

          setTimeout(() => {
            onClose()
            navigate('/dashboard')
          }, 100)
        }
      }
    } catch (err: any) {
      setIsSuccess(false)
      setError(err.message || t('loginForm.phoneFailed'))
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      setError('')
      setLoading(true)
      await authService.resendOTP(loginMethod === 'email' ? email : phone, loginMethod, 'login')
      setIsSuccess(true)
      setError(t('loginForm.otpSentSuccess'))
      setLoading(false)
    } catch (err: any) {
      setIsSuccess(false)
      setError(err.message || t('loginForm.otpResendFailed'))
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {isRegister ? t('loginForm.register') : t('loginForm.login')}
        </h2>

        {!isRegister && !showOtpInput && (
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-2 rounded-md transition-colors ${
                loginMethod === 'email'
                  ? 'bg-white text-slate-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('loginForm.email')}
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 py-2 rounded-md transition-colors ${
                loginMethod === 'phone'
                  ? 'bg-white text-slate-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('loginForm.phone')}
            </button>
          </div>
        )}

        <form onSubmit={loginMethod === 'email' ? handleEmailLogin : handlePhoneLogin} className="space-y-4">
          {loginMethod === 'email' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('loginForm.emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('loginForm.passwordLabel')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('loginForm.phoneLabel')}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('loginForm.phonePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                  disabled={showOtpInput}
                />
              </div>

              {showOtpInput && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('loginForm.verificationCode')}
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder={t('loginForm.codePlaceholder')}
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-slate-600 hover:text-slate-700 text-sm mt-2"
                  >
                    {t('loginForm.resendCode')}
                  </button>
                </div>
              )}
            </>
          )}

          {error && (
            <div className={`text-sm p-3 rounded ${isSuccess ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-600 text-white py-2 px-4 rounded-md hover:bg-slate-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? t('loginForm.pleaseWait') : showOtpInput ? t('loginForm.verifyAndLogin') : (isRegister ? t('loginForm.register') : t('loginForm.login'))}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-slate-600 hover:text-slate-700 text-sm"
          >
            {isRegister ? t('loginForm.hasAccountLogin') : t('loginForm.noAccountRegister')}
          </button>
        </div>
      </div>
    </div>
  )
}
