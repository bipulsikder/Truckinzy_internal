"use client"

import { useEffect, useState } from "react"
import { CookieConsent } from "./cookie-consent"

export function CookieConsentWrapper() {
  const [isClient, setIsClient] = useState(false)
  const [showCookieConsent, setShowCookieConsent] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Check for existing cookie consent
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setShowCookieConsent(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setShowCookieConsent(false)
    console.log('🍪 Cookies accepted')
  }

  const rejectCookies = () => {
    localStorage.setItem('cookie-consent', 'rejected')
    setShowCookieConsent(false)
    console.log('❌ Cookies rejected')
  }

  // Don't render anything on server-side to prevent hydration mismatch
  if (!isClient) {
    return null
  }

  return (
    <CookieConsent
      isVisible={showCookieConsent}
      onAccept={acceptCookies}
      onReject={rejectCookies}
    />
  )
} 