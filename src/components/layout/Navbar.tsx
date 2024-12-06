
'use client'

import { Fragment } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Tournaments', href: '/tournaments' },
  { name: 'Matches', href: '/matches' },
  { name: 'Wallet', href: '/wallet' },
]

function classNames(...classes: string[]) {