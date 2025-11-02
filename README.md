# BrainBinge - Interactive AI Learning Platform

Learn anything through interactive AI professors with personalized teaching styles.

## Project Stack

This project is built with:

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **React 18** - UI library
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful component library
- **Supabase** - Backend as a Service
- **@tanstack/react-query** - Data fetching and caching

## Getting Started

### Prerequisites

Make sure you have Node.js installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd BrainBinge

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check for code issues

## Project Structure

```
BrainBinge/
├── src/
│   ├── app/                 # Next.js App Router pages and layouts
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page (Dashboard)
│   │   ├── providers.tsx    # Client-side providers
│   │   ├── globals.css      # Global styles
│   │   ├── create-lesson/   # Create lesson page
│   │   └── lesson/[id]/     # Dynamic lesson view page
│   ├── components/
│   │   ├── pages/           # Page-level components
│   │   └── ui/              # Reusable UI components (shadcn/ui)
│   ├── lib/
│   │   ├── supabase/        # Supabase client configuration
│   │   └── utils.ts         # Utility functions
│   └── hooks/               # Custom React hooks
├── public/                  # Static assets
├── middleware.ts            # Next.js middleware (Supabase auth)
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

## Features

- 🎓 Interactive AI professors with customizable personalities
- 📚 Support for various learning materials
- 🎨 Beautiful dark mode UI with gradient accents
- 💬 Real-time chat interface for learning
- 📊 Learning progress tracking
- 🔊 Voice-enabled AI professors
- 🎙️ **Podcast Mode** - Convert lessons into natural two-person conversations

## Deployment

### Vercel (Recommended)

The easiest way to deploy your Next.js app is to use [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository on Vercel
3. Vercel will automatically detect Next.js and configure the build
4. Your app will be deployed!

### Other Platforms

You can also deploy to:
- **Netlify** - Full Next.js support
- **AWS Amplify** - Supports Next.js SSR
- **Railway** - Simple deployment platform
- **Self-hosted** - Run `npm run build` then `npm run start`

## Environment Variables

Create a `.env.local` file in the project root:

```env
# OpenAI API Key (required for lesson generation and podcast scripts)
OPENAI_API_KEY=sk-...

# Speechify API Key (required for text-to-speech in lessons and podcasts)
SPEECHIFY_API_KEY=your_speechify_api_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Whop Payment Integration
WHOP_WEBHOOK_SECRET=your_whop_webhook_secret
WHOP_API_KEY=your_whop_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Subscription & Payment Setup

BrainBinge uses [Whop](https://whop.com) for subscription management. To set this up:

1. **Run the database migration** to add subscription fields:
   ```bash
   # See docs/SETUP_SUBSCRIPTION.md for detailed instructions
   ```

2. **Configure Whop integration**:
   - Create products in Whop Dashboard
   - Set up webhooks
   - Update checkout links in `src/components/modals/SubscriptionModal.tsx`

3. **Read the guides**:
   - 📖 [Subscription Setup Guide](/docs/SETUP_SUBSCRIPTION.md)
   - 📖 [Whop Integration Guide](/docs/WHOP_INTEGRATION.md)
   - 📖 [Database Setup](/DATABASE_SETUP.md)
   - 📖 [Auth Implementation](/AUTH_IMPLEMENTATION.md)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
