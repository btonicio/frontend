# 🚀 Crypto Signals Frontend - Next.js

**Modern, Fast, Professional Dashboard with Next.js 14 App Router**

## Features

✅ **Next.js 14+ App Router** - Latest React with server components  
✅ **TypeScript** - Full type safety  
✅ **Tailwind CSS** - Headless UI + custom styling  
✅ **TradingView Lightweight Charts** - Professional charting  
✅ **Zustand** - Lightweight state management  
✅ **SWR** - React Hooks for data fetching  
✅ **Real-time WebSocket** - Live signals with auto-reconnect  
✅ **Dark Mode** - Beautiful dark theme  
✅ **Responsive Design** - Mobile & desktop optimized  

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env

# 3. Update environment variables if needed
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
# NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws

# 4. Run development server
npm run dev

# 5. Open browser
# http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   ├── Dashboard.tsx      # Main dashboard component
│   ├── Header.tsx         # Header with status
│   ├── TabNavigation.tsx  # Tab switcher
│   ├── SignalCard.tsx     # Single signal card
│   └── tabs/
│       ├── SignalsTab.tsx         # Signals view
│       ├── PerformanceTab.tsx     # Performance metrics
│       ├── BacktestTab.tsx        # Backtest form & results
│       └── ChartsTab.tsx          # TradingView charts
├── services/
│   └── api.ts             # API client with axios
├── hooks/
│   └── useWebSocket.ts    # WebSocket connection hook
├── store/
│   └── appStore.ts        # Zustand state management
└── types/
    └── index.ts           # TypeScript types
```

## Key Technologies

### Frontend Framework
- **Next.js 14** - React framework with App Router

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Headless UI** - Unstyled, accessible components

### Charts
- **TradingView Lightweight Charts** - Professional candlestick charts

### State Management
- **Zustand** - Lightweight and simple state management
- **SWR** - React hooks for data fetching with caching

### HTTP Client
- **Axios** - HTTP client for API calls

### Other
- **date-fns** - Date manipulation library
- **clsx** - Utility for constructing classNames

## Environment Variables

Create `.env.local` file:

```
# API endpoints (must match backend)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws

# Production URLs
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
# NEXT_PUBLIC_WS_URL=wss://yourdomain.com/ws
```

## Available Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Production
npm run build            # Build for production
npm start               # Start production server

# Linting
npm run lint            # Run ESLint
npm run type-check      # Check TypeScript types
```

## Features

### 1. Real-time Signals
- WebSocket connection to backend
- Auto-reconnect with exponential backoff
- Live signal updates in dashboard
- Signal cards with breakdown of indicators

### 2. Performance Metrics
- Customizable date range (7/14/30/90 days)
- Signal distribution (BUY/SELL/NEUTRAL)
- Confidence breakdown (HIGH/MEDIUM/LOW)
- Buy/Sell ratio visualization

### 3. Backtesting
- Run backtest for any asset
- Custom date range
- Initial capital configuration
- Detailed results with metrics

### 4. Charts
- TradingView Lightweight Charts
- Candlestick visualization
- Responsive and interactive
- Ready for signal overlay

## State Management (Zustand)

```typescript
// Use store in components
import { useAppStore } from '@/store/appStore';

function MyComponent() {
  const { signals, selectedTab, setSelectedTab } = useAppStore();
  // ...
}
```

## API Integration (SWR)

```typescript
// Fetch data with SWR
import useSWR from 'swr';
import { signalApi } from '@/services/api';

function MyComponent() {
  const { data, isLoading, error } = useSWR(
    '/signals/current',
    () => signalApi.getCurrent()
  );
  // ...
}
```

## WebSocket Connection

```typescript
// Automatically connects in Dashboard
import { useWebSocket } from '@/hooks/useWebSocket';

useWebSocket('ws://localhost:3001/ws');
```

## Deployment

### Vercel (Recommended)
```bash
# Push to GitHub
git push origin main

# Connect repo to Vercel dashboard
# Set environment variables in Vercel project settings
# Deploy automatically on push
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Performance Tips

1. **Images**: Use Next.js Image component for optimization
2. **Code Splitting**: App Router automatically splits code
3. **Caching**: SWR caches requests automatically
4. **SSR**: Server components by default in App Router
5. **CSS**: Tailwind purges unused styles in production

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### WebSocket connection fails
- Check backend is running
- Verify NEXT_PUBLIC_WS_URL is correct
- Check firewall/proxy settings

### Blank page
- Clear `.next/` cache: `rm -rf .next`
- Restart dev server

### API 404 errors
- Verify backend is running on correct port
- Check NEXT_PUBLIC_API_URL in .env

## Next Steps

1. Connect to real backend API
2. Implement real chart data
3. Add more indicators
4. Setup real WebSocket connection
5. Deploy to production

## Support & Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [SWR](https://swr.vercel.app)
- [TradingView Charts](https://www.tradingview.com/lightweight-charts/)

---

**Happy coding! 🚀**
