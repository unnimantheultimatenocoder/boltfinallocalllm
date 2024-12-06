
// Add these types to your existing database.ts file

export interface TournamentRules {
  rules: string[]
  prize_distribution: {
    position: number
    amount: number
  }[]
}

export interface Match {
  id: string
  tournament_id: string
  player1_id: string
  player2_id: string
  scheduled_time: string
  status: 'pending' | 'in_progress' | 'completed'
  winner_id: string | null
  score: string | null
  round: number
}