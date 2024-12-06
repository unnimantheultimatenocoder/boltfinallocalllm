
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function VerifyPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (session) {
          toast.success('Email verified successfully!')
          router.push('/dashboard')
        } else {
          throw new Error('No session found')
        }
      } catch (error: any) {
        toast.error('Verification failed. Please try again.')
        router.push('/auth')
      } finally {
        setLoading(false)
      }
    }

    handleEmailConfirmation()
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">