"use client"

import { CandidateProvider } from "@/contexts/candidate-context"
import { CandidateDashboard } from "@/components/candidate-dashboard"

export default function CandidatesPage() {
  return (
    <CandidateProvider>
      <div className="container mx-auto p-6">
        <CandidateDashboard />
      </div>
    </CandidateProvider>
  )
}