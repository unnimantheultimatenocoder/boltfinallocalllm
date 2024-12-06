
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Tournament {
  id: string
  title: string
  game_type: string
  entry_fee: number
  prize_pool: number
  status: string
  start_time: string
  position?: number
  prize_amount?: number
}

export default function TournamentHistory({ userId }: { userId: string }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchTournaments()
  }, [userId])

  async function fetchTournaments() {
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select(`
          tournament:tournaments(*),
          tournament_results(position, prize_amount)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const processedData = data.map(item => ({
        ...item.tournament,
        position: item.tournament_results?.[0]?.position,
        prize_amount: item.tournament_results?.[0]?.prize_amount
      }))

      setTournaments(processedData)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load tournament history')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded"></div>
        ))}
      </div>
    )
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">No tournaments found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Tournament History</h3>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tournament
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Game Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Result
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tournaments.map((tournament)