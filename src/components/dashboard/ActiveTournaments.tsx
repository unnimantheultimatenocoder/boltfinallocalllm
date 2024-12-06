
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Tournament {
  id: string
  title: string
  game_type: string
  entry_fee: number
  prize_pool: number
  max_players: number
  current_players: number
  start_time: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  is_joined?: boolean
  tournament_participants?: any[]
}

export default function ActiveTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningTournament, setJoiningTournament] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchTournaments()
  }, [])

  async function fetchTournaments() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_participants!inner(user_id)
        `)
        .in('status', ['upcoming', 'in_progress'])
        .order('start_time', { ascending: true })
        .limit(5)

      if (error) throw error

      const processedTournaments = data.map(tournament => ({
        ...tournament,
        is_joined: tournament.tournament_participants.some(
          (p: any) => p.user_id === user.id
        )
      }))

      setTournaments(processedTournaments)
    } catch (error) {
      console.error('Error fetching tournaments:', error)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinTournament(tournamentId: string) {
    try {
      setJoiningTournament(tournamentId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to join tournaments')
        return
      }

      const { data, error } = await supabase
        .rpc('join_tournament', {
          p_tournament_id: tournamentId,
          p_user_id: user.id
        })

      if (error) throw error

      if (data.success) {
        toast.success(data.message)
        fetchTournaments()
      } else {
        toast.error(data.message)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setJoiningTournament(null)
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

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Active Tournaments</h2>
        <Link 
          href="/tournaments" 
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          View all tournaments
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No active tournaments</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by joining a tournament.</p>
          <div className="mt-6">
            <Link
              href="/tournaments"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Browse Tournaments
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {tournaments.map((tournament) => (
              <li key={tournament.id} className="relative">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col flex-grow">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-indigo-600">
                          {tournament.title}
                        </p>
                        <div className="ml-2 flex flex-shrink-0">
                          <p className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(tournament.status)}`}>
                            {tournament.status}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {tournament.game_type}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 sm:flex sm:justify-between">
                    <div className="sm:flex space-x-6">
                      <p className="flex items-center text-sm text-gray-500">
                        <svg className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        <span className={tournament.current_players >= tournament.max_players ? 'text-red-500 font-medium' : ''}>
                          {tournament.current_players} / {tournament.max_players} Players
                        </span>
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                        Entry Fee: ₹{tournament.entry_fee}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Prize Pool: ₹{tournament.prize_pool}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between sm:mt-0 sm:ml-6">
                      <p className="flex items-center text-sm text-gray-500">
                        <svg className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {new Date(tournament.start_time).toLocaleString()}
                      </p>
                      {!tournament.is_joined && tournament.status === 'upcoming' && (
                        <button
                          onClick={() => handleJoinTournament(tournament.id)}
                          disabled={joiningTournament === tournament.id || tournament.current_players >= tournament.max_players}
                          className={`ml-4 inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                            tournament.current_players >= tournament.max_players
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-500'
                          }`}
                        >
                          {joiningTournament === tournament.id ? (
                            'Joining...'
                          ) : tournament.current_players >= tournament.max_players ? (
                            'Full'
                          ) : (
                            'Join Tournament'
                          )}
                        </button>
                      )}
                      {tournament.is_joined && (
                        <span className="ml-4 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-sm font-medium text-green-700">
                          Joined
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/tournaments/${tournament.id}`}
                  className="absolute inset-0 rounded-md ring-blue-400 focus:z-10 focus:outline-none focus:ring-2"
                >
                  <span className="sr-only">View tournament details</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
</boltAction