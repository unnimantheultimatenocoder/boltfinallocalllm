
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tournament } from '@/types/database'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import TournamentChat from '@/components/tournaments/TournamentChat'
import ResultSubmission from '@/components/tournaments/ResultSubmission'
import PrizeDistribution from '@/components/tournaments/PrizeDistribution'

interface TournamentDetails extends Tournament {
  tournament_participants: {
    user_id: string
    user: {
      username: string
    }
  }[]
  matches: {
    id: string
    player1_id: string
    player2_id: string
    scheduled_time: string
    status: 'pending' | 'in_progress' | 'completed'
    winner_id: string | null
    score: string | null
    round: number
  }[]
}

export default function TournamentDetailsPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'matches' | 'chat' | 'prizes'>('details')
  const [joining, setJoining] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTournamentDetails()
  }, [params.id])

  async function fetchTournamentDetails() {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_participants (
            user_id,
            user:users (username)
          ),
          matches (
            id,
            player1_id,
            player2_id,
            scheduled_time,
            status,
            winner_id,
            score,
            round
          )
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setTournament(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load tournament details')
      router.push('/tournaments')
    } finally {
      setLoading(false)
    }
  }

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
          p_tournament_id: params.id,
          p_user_id: user.id
        })

      if (error) throw error

      if (data.success) {
        toast.success(data.message)
        fetchTournamentDetails()
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!tournament) return null

  const isUpcoming = tournament.status === 'upcoming'
  const isFull = tournament.current_players >= tournament.max_players
  const hasActiveMatch = tournament.matches.some(m => m.status === 'in_progress')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Tournament Header */}
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-2xl font-bold leading-6 text-gray-900">
            {tournament.title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {tournament.game_type}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            {['details', 'matches', 'chat', 'prizes'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`
                  w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm
                  ${activeTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="px-4 py-5 sm:px-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{tournament.status}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Start Time</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(tournament.start_time).toLocaleString()}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Entry Fee</dt>
                  <dd className="mt-1 text-sm text-gray-900">₹{tournament.entry_fee}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Prize Pool</dt>
                  <dd className="mt-1 text-sm text-gray-900">₹{tournament.prize_pool}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Players</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {tournament.current_players} / {tournament.max_players}
                  </dd>
                </div>
              </dl>

              {/* Participants List */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Participants</h4>
                {tournament.tournament_participants.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {tournament.tournament_participants.map((participant) => (
                      <li key={participant.user_id} className="py-3">
                        <p className="text-sm text-gray-900">{participant.user.username}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No participants yet</p>
                )}
              </div>

              {/* Join Button */}
              {isUpcoming && !isFull && (
                <div>
                  <button
                    onClick={handleJoinTournament}
                    disabled={joining}
                    className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {joining ? 'Joining...' : 'Join Tournament'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'matches' && hasActiveMatch && (
            <div className="space-y-6">
              {tournament.matches
                .filter(match => match.status === 'in_progress')
                .map(match => (
                  <ResultSubmission
                    key={match.id}
                    matchId={match.id}
                    tournamentId={tournament.id}
                    player1={{
                      id: match.player1_id,
                      username: tournament.tournament_participants.find(
                        p => p.user_id === match.player1_id
                      )?.user.username || 'Unknown'
                    }}
                    player2={{
                      id: match.player2_id,
                      username: tournament.tournament_participants.find(
                        p => p.user_id === match.player2_id
                      )?.user.username || 'Unknown'
                    }}
                    onSubmitted={fetchTournamentDetails}
                  />
                ))}
            </div>
          )}

          {activeTab === 'chat' && (
            <TournamentChat tournamentId={tournament.id} />
          )}

          {activeTab === 'prizes' && (
            <PrizeDistribution
              tournamentId={tournament.id}
              prizePool={tournament.prize_pool}
            />
          )}
        </div>
      </div>
    </div>
  )
}