"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { RefreshCw } from "lucide-react"

export interface OTPVerificationProps {
  email?: string
  length?: number
  title?: string
  subtitle?: string
  buttonText?: string
  onVerify?: (code: string) => void | Promise<void>
  onResend?: () => void
  isLoading?: boolean
  error?: string | null
  onBack?: () => void
  isModal?: boolean
  cooldownSeconds?: number
}

export function OTPVerification({
  email = "user@example.com",
  length = 6,
  title = "Enter verification code",
  subtitle = "We emailed you a verification code to",
  buttonText = "Verify Code",
  onVerify,
  onResend,
  isLoading: externalLoading = false,
  error = null,
  onBack,
  isModal = false,
  cooldownSeconds = 60,
}: OTPVerificationProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""))
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(cooldownSeconds)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length)
  }, [length])

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Dedicated paste handler (bypasses maxLength={1} browser restriction on paste)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData("text").trim()
    const cleanedDigits = pastedText.replace(/\D/g, "").slice(0, length).split("")
    if (cleanedDigits.length === 0) return

    const newOtp = Array(length).fill("")
    cleanedDigits.forEach((digit, i) => {
      if (i < length) newOtp[i] = digit
    })
    setOtp(newOtp)

    const lastFocusedIndex = Math.min(cleanedDigits.length - 1, length - 1)
    inputRefs.current[lastFocusedIndex]?.focus()

    const fullCode = newOtp.join("")
    if (fullCode.length === length) {
      triggerVerify(fullCode)
    }
  }

  const handleChange = (index: number, value: string) => {
    // If pasted full code inside input change
    if (value.length > 1) {
      const pasted = value.trim().replace(/\D/g, "").slice(0, length).split("")
      const newOtp = Array(length).fill("")
      pasted.forEach((char, i) => {
        if (i < length) newOtp[i] = char
      })
      setOtp(newOtp)
      const nextFocus = Math.min(pasted.length - 1, length - 1)
      inputRefs.current[nextFocus]?.focus()

      const codeStr = newOtp.join("")
      if (codeStr.length === length) {
        triggerVerify(codeStr)
      }
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    const fullCode = newOtp.join("")
    if (value && index === length - 1 && fullCode.length === length) {
      triggerVerify(fullCode)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const triggerVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otp.join("")
    if (code.length !== length) return

    if (onVerify) {
      onVerify(code)
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsLoading(false)
    console.log("OTP verified:", code)
  }

  const handleResendClick = () => {
    if (cooldown > 0) return
    setCooldown(cooldownSeconds)
    if (onResend) {
      onResend()
    } else {
      console.log("Resending OTP...")
    }
  }

  const activeLoading = externalLoading || isLoading

  const cardContent = (
    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl bg-gray-900 border border-white/10">
      <div className="absolute inset-0 z-0">
        <img
          src="https://media.giphy.com/media/xJT7pzbviKNqTqF1Ps/giphy.gif"
          alt="Tunnel animation"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/80 via-blue-800/90 to-black/95" />
      </div>

      <div className="relative z-10 p-8 py-10">
        <div className="text-center mb-6">
          <div className="w-8 h-8 mx-auto mb-4 text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M13 0L4 14h6l-2 10 9-14h-6l2-10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2 font-sora">{title}</h1>
          <p className="text-white/70 text-xs leading-relaxed">
            {subtitle}
            <br />
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-xl text-center text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-2 mb-6">
          {otp.map((digit, index) => (
            <div key={index} className="relative">
              <input
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onPaste={handlePaste}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-11 h-12 text-center text-lg font-medium bg-white/10 border-white/20 text-white placeholder-white/40 focus:bg-white/20 focus:border-white/40 focus:outline-none transition-all duration-200 border shadow-lg opacity-100 rounded-xl font-mono"
                placeholder=""
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={activeLoading || otp.join("").length !== length}
          onClick={() => triggerVerify()}
          className="w-full py-3 mb-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl transition shadow-xl text-xs flex items-center justify-center gap-2"
        >
          {activeLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : buttonText}
        </button>

        <div className="text-center mb-6">
          <span className="text-white/60 text-xs">Didn't get the code? </span>
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={handleResendClick}
            className={`text-xs font-medium underline transition-colors duration-200 ${
              cooldown > 0 ? "text-white/40 cursor-not-allowed no-underline" : "text-white/80 hover:text-white"
            }`}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
          </button>
        </div>

        {onBack && (
          <div className="text-center mb-4">
            <button
              type="button"
              onClick={onBack}
              className="text-white/60 hover:text-white text-xs transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        <div className="text-center">
          <p className="text-white/50 text-[11px] leading-relaxed">
            By continuing, you agree to our{" "}
            <button type="button" className="text-white/70 hover:text-white underline transition-colors">Terms of Service</button> &{" "}
            <button type="button" className="text-white/70 hover:text-white underline transition-colors">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  )

  if (isModal) {
    return cardContent
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      {cardContent}
    </div>
  )
}
