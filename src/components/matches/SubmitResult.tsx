
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface SubmitResultProps {
  match: {
    id: string
    player1_id: string
    player2_id: string
    player1: { username: string }
    player2: { username: string }
  }
  onClose: () => void
  onSubmitted: () => void
}

export default function SubmitResult({ match, onClose, onSubmitted }: SubmitResultProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    winnerId: '',
    score: '',
    proofImage: null as File | null
  })
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let proofUrl = null

      // Upload proof if provided
      if (formData.proofImage) {
        const fileExt = formData.proofImage.name.split('.').pop()
        const fileName = `${match.id}-${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('match-proofs')
          .upload(`matches/${fileName}`, formData.proofImage)

        if (uploadError) throw uploadError
        proofUrl = uploadData.path
      }

      // Submit result
      const { error } = await supabase
        .from('matches')
        .update({
          winner_id: formData.winnerId,
          score: formData.score,
          proof_url: proofUrl,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', match.id)

      if (error) throw error

      toast.success('Result submitted successfully')
      onSubmitted()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to submit result')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Submit Match Result
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Winner
            