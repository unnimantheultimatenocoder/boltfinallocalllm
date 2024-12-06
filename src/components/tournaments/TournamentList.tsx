
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tournament } from '@/types/database'
import TournamentCard from './TournamentCard'
import toast from 'react-hot-toast'

export default function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'upcoming', 'in_progress', 'completed'
  const supabase = createClient()

  useEffect(() => {
    fetchTournaments()
  }, [filter])

  async function fetchTournaments() {
    try {
      let query = supabase
        .from('tournaments')
        .select(`
          *,
          tournament_participants (
            user_id
          )
        `)
        .order('start_time', { ascending: true })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      setTournaments(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className