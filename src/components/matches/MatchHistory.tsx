
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Match {
  id: string
  tournament_id: string
  tournament: {
    title: string
  }
  player1_id: string
  player2_id: string
  player1: {
    username: string
  }
  player2: {
    username: string
  }
  winner_id: string
  score: string
  status: string
  completed_at: string
}

export default function MatchHistory() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchMatchHistory()
  }, [])

  async function fetchMatchHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          tournament:tournaments(title),
          player1:users!player1_id(username),
          player2:users!player2_id(username)
        `)
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setMatches(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load match history')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded"></div>
        ))}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">No matches found</h3>
        <p className="mt-1 text-sm text-gray-500">
          You haven't completed any matches yet.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tournament
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Players
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Result
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {matches.map((match) => {
            const { data: { user } } = supabase.auth.getUser()
            const isWinner = match.winner_id === user?.id

            return (
              <tr key={match.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {match.tournament.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {match.player1.username} vs {match.player2.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isWinner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isWinner ? 'Won' : 'Lost'} ({match.score})
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(match.completed_at).toLocaleDateString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
</boltAction