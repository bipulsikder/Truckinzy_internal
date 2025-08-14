"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, Cookie, Shield, Zap } from "lucide-react"

interface CookieConsentProps {
  isVisible: boolean
  onAccept: () => void
  onReject: () => void
}

export function CookieConsent({ isVisible, onAccept, onReject }: CookieConsentProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <Card className="shadow-lg border-2 border-blue-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Cookie className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  We use cookies to improve your experience
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-xs text-gray-600 mb-3">
                We use cookies to cache candidate data locally, making the app faster and reducing server load.
              </p>

              {isExpanded && (
                <div className="mb-3 p-3 bg-gray-50 rounded-md">
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-3 w-3 text-green-600" />
                      <span>Faster loading times</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Shield className="h-3 w-3 text-blue-600" />
                      <span>Data stored locally on your device</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Cookie className="h-3 w-3 text-orange-600" />
                      <span>Cache expires after 5 minutes</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={onAccept}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  Accept & Enable Caching
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReject}
                  className="flex-1 text-xs"
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 