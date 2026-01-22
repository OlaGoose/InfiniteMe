# StepTrek v2 - English Learning Game

A modern English learning game built with Next.js 15 and Supabase, combining real-world walking with interactive language practice.

## Features

- 🗺️ **Interactive Map**: Explore locations using Leaflet maps
- 🎮 **Joystick Navigation**: Control movement with an intuitive joystick
- 💬 **AI-Powered Conversations**: Practice English with AI NPCs using Google Gemini
- 🏆 **Challenge Mode**: Complete language challenges to earn rewards
- 🛒 **Shop System**: Buy items to protect against weather effects
- 🌦️ **Dynamic Weather**: Weather system that affects gameplay
- 📚 **Flashcards**: Save vocabulary and grammar corrections
- 📜 **History Log**: Review past conversations and challenges
- 🎯 **Difficulty Levels**: A1 to C2 CEFR-aligned difficulty levels
- 📱 **Mobile-First Design**: Optimized for mobile devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: Multiple providers with auto-fallback
  - Google Gemini (gemini-1.5-flash)
  - OpenAI (GPT-4o-mini)
  - Doubao AI/豆包 (字节跳动)
- **Maps**: Leaflet
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks + Zustand (optional)

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- At least one AI API key (Gemini, OpenAI, or Doubao)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `lib/supabase/schema.sql`
3. Copy your project URL and anon key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Provider Configuration
# Options: 'gemini', 'openai', 'auto' (tries providers in order with fallback)
# Recommended: 'auto' for best reliability
NEXT_PUBLIC_AI_PROVIDER=auto

# Google Gemini API (Optional if using OpenAI or Doubao)
# Get your key: https://makersuite.google.com/app/apikey
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_MODEL=gemini-1.5-flash

# OpenAI API (Optional if using Gemini or Doubao)
# Get your key: https://platform.openai.com/api-keys
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini

# Doubao AI/豆包 (字节跳动) - Primary provider (FIXED!)
# Get your key: https://console.volcengine.com/ark
# 现在使用原生 fetch 调用，已修复兼容性问题
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_CHAT_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_CHAT_MODEL=doubao-seed-1-6-flash-250828
```

**AI Provider Priority:**
- `auto` mode: **Doubao → OpenAI → Gemini** (automatic fallback, recommended)
- `doubao` mode: Doubao only (no fallback)
- `openai` mode: OpenAI only (no fallback)
- `gemini` mode: Gemini only (no fallback)

**重要更新 / Important Update (2026-01-22):**
✅ **豆包模型调用问题已修复！** Doubao API calling issue has been fixed!
- 之前使用 OpenAI SDK 兼容模式导致路径拼接错误
- 现在改用原生 fetch API，与 infinite-craft-game 项目相同的成功实现
- Previous issue: Using OpenAI SDK compatibility mode caused URL path errors
- Now fixed: Using native fetch API, same as the working infinite-craft-game implementation

At least one AI provider must be configured. Using `auto` mode with multiple providers ensures maximum reliability. Doubao is optimized for Chinese users with faster response times.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
v2/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── GameApp.tsx        # Main game component
│   ├── Map.tsx            # Map component
│   └── Joystick.tsx       # Joystick control
├── lib/                   # Libraries and services
│   ├── supabase/          # Supabase client and storage
│   │   ├── client.ts      # Supabase client
│   │   ├── storage.ts     # Storage service
│   │   └── schema.sql     # Database schema
│   └── gemini/            # Gemini AI service
│       └── service.ts     # AI dialogue generation
├── types/                 # TypeScript type definitions
│   └── index.ts
├── constants/             # Game constants
│   └── index.ts
└── utils/                 # Utility functions
    └── geo.ts             # Geographic calculations
```

## Key Features Implementation

### Database Schema

The Supabase database includes:
- `user_stats`: User progress and statistics
- `checkpoints`: Game locations and NPCs
- `flashcards`: Saved vocabulary and grammar cards
- `event_history`: Conversation and challenge history

### AI Integration

Supports multiple AI providers with automatic fallback:

**Providers (Priority Order):**
1. **Doubao AI/豆包 (字节跳动)**: Primary - Optimized for Chinese users ✅ **Fixed!**
2. **OpenAI (GPT-4o-mini)**: Fallback - Fast and reliable
3. **Google Gemini (2.5-flash)**: Final fallback - Creative responses

**Note:** Doubao provider now uses native fetch API for better compatibility and reliability.

**Features:**
- Dynamic dialogue generation
- Grammar correction
- Challenge evaluation
- Text translation and optimization
- Location-based checkpoint generation
- Automatic failover between providers

### Real-World Features

- **Geolocation**: Automatically detects user location
- **Step Counter**: Uses device motion sensors (when available)
- **Weather System**: Dynamic weather that affects gameplay
- **Local Generation**: Generates checkpoints based on real location

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Differences from v1

- **Database**: Uses Supabase instead of localStorage
- **Framework**: Next.js 15 instead of Vite + React
- **Architecture**: Server/Client components separation
- **API**: Uses Google Generative AI SDK instead of @google/genai
- **State Management**: Improved with React hooks and refs

## License

MIT
# InfiniteMe
