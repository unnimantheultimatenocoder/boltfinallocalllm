
'use client'

import { Tournament } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface TournamentCardProps {
  tournament: Tournament & {
    tournament_participants: { user_id: string }[]
  }
  onUpdate: () => void
}

export default function TournamentCard({ tournament, onUpdate }: TournamentCardProps) {
  const [joining, setJoining] = useState(false)
  const supabase = createClient()

  async function handleJoinTournament() {
    try {
      setJoining(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in to join tournaments')
        return
      }

      const { data, error } = await supabase
        .rpc('join_tournament', {
          p_tournament_id: tournament.id,
          p_user_id: user.id
        })

      if (error) throw error

      if (data.success) {
        toast.success(data.message)
        onUpdate()
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setJoining(false)
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {tournament.title}
          </h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
            {tournament.status}
          </span>
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          {tournament.game_type}
        </p>

        <div className="mt-4 space-y-2">