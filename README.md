# GOLFCHARITY

**Play. Win. Give.** - A premium golf charity lottery platform connecting Australian golfers with charitable causes.

## 🏌️ Features

- **Score-based lottery** - Your Stableford scores become your draw numbers
- **Monthly draws** - Win prizes while supporting charity
- **24 partner charities** - Choose where your winnings go
- **Premium design** - "The Noble Game" luxury aesthetic

## 🚀 Tech Stack

- **Frontend**: React + Vite
- **Styling**: TailwindCSS v4
- **Animations**: Framer Motion, GSAP
- **Backend**: Supabase (Auth, Database, Storage)
- **Hosting**: Vercel

## 📦 Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# Run development server
npm run dev
```

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

## 📁 Project Structure

```
src/
├── components/    # UI components
├── context/       # React context (Auth)
├── hooks/         # Custom hooks (useScores, etc.)
├── lib/           # Supabase client
├── pages/         # Page components
└── utils/         # Utility functions
```

## 📄 License

Private - All rights reserved.
