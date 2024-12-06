# Gaming Platform Web Implementation Guide
> Next.js 15 + Supabase Implementation

## Tech Stack
```typescript
const techStack = {
  frontend: {
    framework: 'Next.js 15',
    language: 'TypeScript',
    styling: 'Tailwind CSS',
    stateManagement: 'Zustand'
  },
  backend: {
    database: 'Supabase',
    auth: 'Supabase Auth',
    storage: 'Supabase Storage',
    realtime: 'Supabase Realtime'
  },
  payments: {
    gateway: 'Razorpay',
    methods: ['UPI', 'Cards']
  },
  testing: {
    unit: 'Vitest',
    e2e: 'Playwright',
    component: '@testing-library/react'
  }
}
```

## Project Structure
```
src/
├── app/                     # Next.js app router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── auth/               # Auth routes
│   ├── tournaments/        # Tournament routes
│   ├── matches/           # Match routes
│   └── wallet/            # Wallet routes
├── components/            # React components
│   ├── ui/               # UI components
│   ├── tournament/       # Tournament components
│   ├── match/           # Match components
│   └── providers/       # Context providers
├── lib/                 # Utility functions
│   ├── supabase/       # Supabase clients
│   ├── utils/          # Helper functions
│   └── constants/      # App constants
├── hooks/              # Custom React hooks
├── store/             # Zustand store
├── types/             # TypeScript types
├── styles/           # Global styles
└── tests/            # Test files

## Configuration Files
├── .env.example      # Environment variables template
├── .env.local       # Local environment variables
├── next.config.js   # Next.js configuration
├── tailwind.config.js # Tailwind configuration
├── tsconfig.json    # TypeScript configuration
└── vitest.config.ts # Vitest configuration
```

## Database Schema

### Core Tables
```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table with profiles
create table public.users (
  id uuid references auth.users primary key,
  username text unique,
  email text unique,
  wallet_balance decimal default 0,
  game_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add row level security
alter table public.users enable row level security;

create policy "Users can read their own data" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own data" on public.users
  for update using (auth.uid() = id);

-- Tournaments
create table public.tournaments (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  game_type text not null,
  entry_fee decimal not null check (entry_fee >= 0),
  prize_pool decimal not null check (prize_pool >= 0),
  max_players integer not null check (max_players > 1),
  current_players integer default 0 check (current_players >= 0),
  start_time timestamp with time zone not null,
  status text default 'upcoming' check (status in ('upcoming', 'in_progress', 'completed', 'cancelled')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Matches
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id),
  player1_id uuid references users(id),
  player2_id uuid references users(id),
  winner_id uuid references users(id),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'disputed')),
  score text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Transactions
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  amount decimal not null,
  type text check (type in ('deposit', 'withdrawal', 'entry_fee', 'prize')),
  status text default 'pending' check (status in ('pending', 'completed', 'failed')),
  reference_id text,
  created_at timestamp with time zone default now()
);

-- Database Functions and Triggers
-- Update timestamp trigger
create or replace function update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply update timestamp trigger to all tables
create trigger update_timestamp
  before update on users
  for each row execute procedure update_timestamp();

create trigger update_timestamp
  before update on tournaments
  for each row execute procedure update_timestamp();

create trigger update_timestamp
  before update on matches
  for each row execute procedure update_timestamp();

-- Tournament player count trigger
create or replace function update_tournament_player_count()
returns trigger as $$
begin
  update tournaments
  set current_players = (
    select count(distinct player1_id) + count(distinct player2_id)
    from matches
    where tournament_id = new.tournament_id
  )
  where id = new.tournament_id;
  return new;
end;
$$ language plpgsql;

create trigger update_tournament_players
  after insert or update or delete on matches
  for each row execute procedure update_tournament_player_count();
```

## Implementation Steps

### 1. Project Setup
```bash
# Create Next.js project
npx create-next-app@latest gaming-platform --typescript --tailwind --app

# Install dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs zustand @hookform/resolvers zod react-hot-toast

# Install dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @playwright/test
```

### 2. Environment Setup
```env
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_RAZORPAY_KEY=your_razorpay_key
RAZORPAY_SECRET=your_razorpay_secret
```

### 3. Supabase Client Setup
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 4. State Management Setup
```typescript
// store/auth-store.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

### 5. Error Boundary Component
```typescript
// components/error-boundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Oops, something went wrong!</h2>
            <button
              className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 6. API Routes Example
```typescript
// app/api/tournaments/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 7. Test Setup Example
```typescript
// tests/tournament.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TournamentList from '@/components/tournament/tournament-list';

describe('TournamentList', () => {
  it('renders tournament list correctly', () => {
    render(<TournamentList tournaments={[]} />);
    expect(screen.getByText('No tournaments found')).toBeInTheDocument();
  });
});
```

### 8. Database Operations Example
```typescript
// lib/supabase/tournaments.ts
import { supabase } from './client';

export async function createTournament(tournamentData: TournamentCreate) {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .insert(tournamentData)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
```

## Error Handling Strategy

### 1. API Error Handling
```typescript
// lib/utils/api-error.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return { message: error.message, statusCode: error.statusCode };
  }
  return { message: 'Internal Server Error', statusCode: 500 };
}
```

### 2. Database Error Recovery
```typescript
// lib/utils/db-retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1, delay * 2);
  }
}
```

## Testing Strategy

### 1. Unit Tests
Focus on testing individual components and utilities in isolation.

### 2. Integration Tests
Test the interaction between components and external services.

### 3. E2E Tests
Test complete user flows from start to finish.

### 4. API Tests
Test all API endpoints for correct behavior and error handling.

## Deployment Considerations

### 1. Environment Variables
- Ensure all required environment variables are set
- Use different variables for development and production

### 2. Database Migrations
- Keep track of all database changes
- Test migrations in staging environment

### 3. Error Monitoring
- Implement error tracking (e.g., Sentry)
- Set up logging for critical operations

## Security Considerations

### 1. Authentication
- Implement proper session management
- Use secure password hashing
- Implement rate limiting

### 2. Data Protection
- Implement row level security in Supabase
- Sanitize user inputs
- Validate data on both client and server

### 3. API Security
- Implement CORS policies
- Use CSRF protection
- Rate limit API endpoints

## Performance Optimization

### 1. Frontend
- Implement code splitting
- Use image optimization
- Implement caching strategies

### 2. Backend
- Optimize database queries
- Implement connection pooling
- Use edge functions where appropriate

## Development Workflow

### 1. Version Control
- Use feature branches
- Implement PR reviews
- Maintain clean commit history

### 2. Code Quality
- Use ESLint and Prettier
- Implement pre-commit hooks
- Maintain consistent code style

### 3. Documentation
- Document API endpoints
- Maintain README
- Document component usage

## Additional Project Structure Details
```
src/
├── app/                    
│   ├── auth/              
│   │   ├── login/         # Login page
│   │   ├── register/      # Registration page
│   │   └── profile/       # Profile management
│   ├── tournaments/       
│   │   ├── page.tsx       # Tournaments list
│   │   ├── [id]/          # Tournament details
│   │   ├── create/        # Create tournament
│   │   └── join/          # Join tournament
│   ├── matches/          
│   │   ├── page.tsx      # Active matches
│   │   ├── [id]/         # Match details
│   │   └── history/      # Match history
│   └── wallet/           
│       ├── page.tsx      # Wallet overview
│       ├── deposit/      # Add money
│       └── withdraw/     # Withdraw funds
├── components/           
│   ├── ui/              
│   │   ├── Button/      # Custom button component
│   │   ├── Card/        # Card container
│   │   ├── Input/       # Form input
│   │   ├── Modal/       # Modal dialogs
│   │   └── Toast/       # Notifications
│   ├── tournament/      
│   │   ├── TournamentCard/
│   │   ├── TournamentList/
│   │   └── JoinButton/
│   └── match/          
│       ├── MatchCard/
│       ├── ScoreSubmit/
│       └── Timer/
```

## Page Flows and Features

### Authentication Flow
1. **Login Page** (`/auth/login`)
   ```typescript
   interface LoginPageFeatures {
     components: [
       'EmailPasswordForm',
       'GoogleLoginButton',
       'ForgotPasswordLink'
     ],
     functions: [
       'handleEmailLogin',
       'handleSocialLogin',
       'validateCredentials'
     ]
   }
   ```

2. **Registration Page** (`/auth/register`)
   ```typescript
   interface RegistrationPageFeatures {
     components: [
       'RegistrationForm',
       'GameIDVerification',
       'TermsAcceptance'
     ],
     functions: [
       'handleRegistration',
       'verifyGameID',
       'validateUserData'
     ]
   }
   ```

### Tournament Flow
1. **Tournaments List** (`/tournaments`)
   ```typescript
   interface TournamentListFeatures {
     components: [
       'TournamentFilters',
       'TournamentGrid',
       'CreateTournamentButton'
     ],
     functions: [
       'fetchTournaments',
       'filterTournaments',
       'joinTournament'
     ],
     filters: [
       'gameType',
       'entryFee',
       'status'
     ]
   }
   ```

2. **Tournament Details** (`/tournaments/[id]`)
   ```typescript
   interface TournamentDetailsFeatures {
     components: [
       'TournamentInfo',
       'PlayersList',
       'MatchBracket',
       'JoinButton'
     ],
     functions: [
       'fetchTournamentDetails',
       'handleJoinTournament',
       'checkEligibility'
     ]
   }
   ```

### Match Flow
1. **Active Match** (`/matches/[id]`)
   ```typescript
   interface MatchFeatures {
     components: [
       'MatchTimer',
       'PlayerInfo',
       'ScoreSubmission',
       'ChatWindow'
     ],
     functions: [
       'submitScore',
       'verifyResults',
       'reportIssue'
     ]
   }
   ```

### Wallet Flow
1. **Wallet Overview** (`/wallet`)
   ```typescript
   interface WalletFeatures {
     components: [
       'BalanceCard',
       'TransactionHistory',
       'ActionButtons'
     ],
     functions: [
       'fetchBalance',
       'fetchTransactions',
       'initiateTransaction'
     ]
   }
   ```

## Dependencies Breakdown

### Core Dependencies
```json
{
  "dependencies": {
    "@supabase/auth-helpers-nextjs": "Latest",
    "@supabase/supabase-js": "Latest",
    "next": "15.x",
    "react": "18.x",
    "react-dom": "18.x",
    "zustand": "^4.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "react-hot-toast": "^2.x",
    "date-fns": "^2.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "razorpay": "^2.x"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x",
    "eslint": "^8.x",
    "prettier": "^3.x",
    "vitest": "^0.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "@playwright/test": "^1.x"
  }
}
```

## Component Specifications

### UI Components
```typescript
// components/ui/Button/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// components/ui/Input/Input.tsx
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number';
  label: string;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
}
```

### Feature Components
```typescript
// components/tournament/TournamentCard/TournamentCard.tsx
interface TournamentCardProps {
  tournament: {
    id: string;
    title: string;
    gameType: string;
    entryFee: number;
    prizePool: number;
    startTime: Date;
    currentPlayers: number;
    maxPlayers: number;
    status: TournamentStatus;
  };
  onJoin?: () => void;
}

// components/match/ScoreSubmit/ScoreSubmit.tsx
interface ScoreSubmitProps {
  matchId: string;
  player1Id: string;
  player2Id: string;
  onSubmit: (score: string) => Promise<void>;
}
```

## Navigation Structure
```typescript
// lib/constants/routes.ts
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile'
  },
  TOURNAMENTS: {
    LIST: '/tournaments',
    DETAILS: (id: string) => `/tournaments/${id}`,
    CREATE: '/tournaments/create',
    JOIN: (id: string) => `/tournaments/${id}/join`
  },
  MATCHES: {
    ACTIVE: '/matches',
    DETAILS: (id: string) => `/matches/${id}`,
    HISTORY: '/matches/history'
  },
  WALLET: {
    OVERVIEW: '/wallet',
    DEPOSIT: '/wallet/deposit',
    WITHDRAW: '/wallet/withdraw'
  }
} as const;
```
