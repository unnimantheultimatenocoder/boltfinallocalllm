
'use client'

import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function QuickActions() {
  const router = useRouter()

  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => router.push('/tournaments/create')}
          className="relative block w-full rounded-lg bg-white p-4 text-left shadow hover:bg-gray-50"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <span className="block text-sm font-medium text-gray-900">Create Tournament</span>
              <span className="mt-1 block text-sm text-gray-500">Host a new tournament</span>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => router.push('/tournaments')}
          className="relative block w-full rounded-lg bg-white p-4 text-left shadow hover:bg-gray-50"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
              </svg>
            </div>
            <div className="ml-4">
              <span className="block text-sm font-medium text-gray-900">Join Tournament</span>
              <span className="mt-1 block text-sm text-gray-500">Browse available tournaments</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
</