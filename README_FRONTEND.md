# Gaming Terminal - Frontend

A modern, responsive React/Next.js frontend for the Gaming Terminal memecoin launchpad on Solana. This application provides a comprehensive interface for creating, trading, and managing memecoin pools with bonding curves and automatic Raydium migration.

![Gaming Terminal Dashboard](https://img.shields.io/badge/Built%20with-Next.js-black?logo=next.js&logoColor=white)
![Solana](https://img.shields.io/badge/Blockchain-Solana-purple?logo=solana&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)

## 🌟 Features

### 🏠 **Dashboard**
- **Real-time Metrics**: Track total pools, trading volume, active traders, and migration success rates
- **Featured Pools**: Display top performing memecoin pools with progress indicators
- **Recent Activity**: Live feed of pool creation, trading, and migration events
- **Migration Analytics**: Visual representation of pool graduation to Raydium DEX
- **Quick Actions**: One-click access to pool creation, trading, and analytics

### 🚀 **Pool Creation**
- **Token Metadata**: Comprehensive form for token name, symbol, and description
- **Image Upload**: Drag-and-drop interface for token logos with preview
- **Vesting Configuration**: Set vesting periods (1-13 days) for token distribution
- **Liquidity Lock**: Configure liquidity lock periods for security
- **Live Preview**: Real-time preview of token configuration and bonding curve
- **Form Validation**: Robust validation with clear error messages

### 📈 **Trading Interface**
- **Pool Selection**: Browse and select from available memecoin pools
- **Buy/Sell Trading**: Intuitive interface for SOL ↔ Memecoin swaps
- **Real-time Pricing**: Live price updates with 24h change indicators
- **Migration Alerts**: Warnings when pools near 80% migration threshold
- **Trade Calculator**: Automatic calculation of token amounts and fees
- **Pool Statistics**: Detailed stats including market cap, volume, and participants
- **Quick Actions**: Preset trading amounts for easy transactions

### 🔗 **Wallet Integration**
- **Multi-wallet Support**: Phantom, Solflare, Torus, and Ledger wallets
- **Connection Status**: Clear indication of wallet connection state
- **Network Configuration**: Automatic network detection and configuration

## 🛠️ Tech Stack

### **Frontend Framework**
- **Next.js 15**: React framework with App Router for optimal performance
- **TypeScript**: Full type safety throughout the application
- **React 18**: Latest React features including Suspense and Concurrent Features

### **Styling & UI**
- **Tailwind CSS**: Utility-first CSS framework for rapid development
- **Framer Motion**: Smooth animations and transitions
- **Radix UI**: Unstyled, accessible UI components
- **Lucide React**: Beautiful, customizable icons

### **Solana Integration**
- **@solana/wallet-adapter**: Comprehensive wallet integration
- **@solana/web3.js**: Solana blockchain interaction
- **Anchor Framework**: Integration with Solana programs

### **Form Handling**
- **React Hook Form**: Performant form library
- **Zod**: TypeScript-first schema validation
- **@hookform/resolvers**: Resolver for Zod validation

### **Notifications**
- **React Hot Toast**: Beautiful toast notifications

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Solana CLI (for local development)
- Phantom/Solflare wallet (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GamingTerminal-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899
   NEXT_PUBLIC_SOLANA_NETWORK=localnet
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Environment Configuration

The application supports multiple Solana networks:

- **Localnet**: `http://127.0.0.1:8899` (default for development)
- **Devnet**: `https://api.devnet.solana.com`
- **Mainnet**: `https://api.mainnet-beta.solana.com`

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles and CSS variables
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Dashboard page
│   ├── create/
│   │   └── page.tsx       # Pool creation page
│   └── trading/
│       └── page.tsx       # Trading page
├── components/
│   ├── dashboard/
│   │   └── Dashboard.tsx  # Main dashboard component
│   ├── layout/
│   │   └── Header.tsx     # Navigation header
│   ├── pool/
│   │   └── CreatePoolForm.tsx  # Pool creation form
│   ├── providers/
│   │   └── WalletProvider.tsx  # Solana wallet provider
│   ├── trading/
│   │   └── TradingInterface.tsx  # Trading interface
│   └── ui/                # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── progress.tsx
│       ├── select.tsx
│       └── ...
├── lib/
│   └── utils.ts           # Utility functions
└── ...
```

## 🎨 Design System

### **Color Palette**
- **Primary**: Purple gradient (`#8b5cf6` to `#a855f7`)
- **Background**: Dark slate (`#0f172a`, `#1e293b`)
- **Accent**: Green for positive actions, Red for negative
- **Muted**: Slate tones for secondary content

### **Typography**
- **Font Family**: Inter (system font fallback)
- **Headings**: Bold weights with gradient text effects
- **Body**: Regular weight with proper contrast ratios

### **Components**
- **Cards**: Glass morphism effect with backdrop blur
- **Buttons**: Gradient backgrounds with hover animations
- **Forms**: Clean, accessible inputs with validation states
- **Progress Bars**: Animated progress indicators with status colors

## 🔧 Key Components

### **Dashboard**
- Animated metrics cards with trend indicators
- Featured pools with real-time progress tracking
- Recent activity feed with live updates
- Migration success rate visualization
- Quick action buttons for common tasks

### **Pool Creation Form**
- Multi-step form with validation
- Image upload with drag-and-drop
- Real-time preview of token configuration
- Bonding curve visualization
- Form persistence and error handling

### **Trading Interface**
- Pool selection with detailed statistics
- Buy/sell toggle with different styling
- Real-time price calculation
- Migration status warnings
- Trade summary with fees and slippage

### **Wallet Integration**
- Multi-wallet support with modal selection
- Connection status indicators
- Network detection and switching
- Error handling for wallet interactions

## 🎯 Features Implemented

### **Core Functionality**
- ✅ Wallet connection and management
- ✅ Pool creation with metadata
- ✅ Token trading (buy/sell simulation)
- ✅ Real-time UI updates
- ✅ Migration status tracking
- ✅ Responsive design for all devices

### **UI/UX Features**
- ✅ Dark mode theme with gaming aesthetics
- ✅ Smooth animations and transitions
- ✅ Loading states and error handling
- ✅ Toast notifications for user feedback
- ✅ Accessible components following WCAG guidelines
- ✅ Mobile-first responsive design

### **Advanced Features**
- ✅ Form validation with TypeScript
- ✅ Real-time price calculations
- ✅ Migration alerts and warnings
- ✅ Drag-and-drop file uploads
- ✅ Progressive Web App capabilities

## 🚦 Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # ESLint code checking
npm run lint:fix     # Auto-fix ESLint issues

# Testing
npm run test         # Run test suite (when implemented)
npm run test:watch   # Watch mode for tests
```

## 🔒 Security Considerations

### **Wallet Security**
- Never store private keys in the frontend
- Use secure wallet adapters for all transactions
- Validate all user inputs before blockchain interactions

### **Input Validation**
- Client-side validation with Zod schemas
- Sanitize all user inputs
- Prevent injection attacks through proper encoding

### **Network Security**
- Use HTTPS in production
- Implement proper CORS policies
- Rate limiting for API calls

## 🌐 Deployment

### **Vercel (Recommended)**
1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

### **Other Platforms**
- **Netlify**: Static site deployment
- **AWS Amplify**: Full-stack deployment
- **Docker**: Containerized deployment

## 📈 Performance Optimizations

### **Bundle Optimization**
- Code splitting with Next.js dynamic imports
- Tree shaking to remove unused code
- Optimized image loading with Next.js Image component

### **Runtime Performance**
- React 18 Concurrent Features for smooth UI
- Memoization of expensive calculations
- Efficient re-rendering with proper dependency arrays

### **Loading States**
- Skeleton loaders for better perceived performance
- Progressive loading of non-critical content
- Optimistic UI updates for better UX

## 🐛 Known Issues & Future Improvements

### **Current Limitations**
- Simulation mode for trading (needs Solana program integration)
- Mock data for pools and statistics
- Basic error handling for wallet failures

### **Planned Features**
- Real Solana program integration
- Advanced charting and analytics
- Portfolio tracking
- Social features (comments, ratings)
- Mobile app version

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper tests
4. Submit a pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Solana Foundation** for the amazing blockchain platform
- **Raydium** for the CPMM integration
- **Metaplex** for NFT and token metadata standards
- **Anchor Framework** for simplified Solana development
- **21st.dev** for UI component inspiration

---

**Built with ❤️ for the Gaming Terminal Ecosystem**

*This frontend provides a modern, accessible interface for the Gaming Terminal launchpad, enabling users to easily create, trade, and manage memecoin pools with automatic migration to Raydium DEX.* 