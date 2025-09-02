# ProtectedPay

<div align="center">
  <h1>🛡️ ProtectedPay</h1>
  <h3>Smart. Secure. Multi-Chain Crypto Transfers</h3>
  
  <p>A revolutionary DeFi platform for secure transfers, group payments, and smart savings across multiple EVM-compatible blockchains.</p>
  
  <img src="https://img.shields.io/badge/Next.js-14.2.13-black" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/Ethers.js-5.8.0-orange" alt="Ethers.js">
  <img src="https://img.shields.io/badge/Wagmi-2.0-green" alt="Wagmi">
  <img src="https://img.shields.io/badge/RainbowKit-1.0-purple" alt="RainbowKit">
</div>

## 🚀 Overview

ProtectedPay is a comprehensive DeFi application that enables secure cryptocurrency transfers, collaborative group payments, and goal-based savings across multiple blockchain networks. Built with modern web technologies, it provides a seamless user experience while maintaining the highest security standards.

## ✨ Key Features

### 🛡️ Protected Transfers
- **Escrow-based Security**: Funds are held securely until claimed by recipients
- **Username System**: Send to memorable usernames instead of complex addresses
- **Multi-Chain Support**: Transfer across 10+ supported blockchain networks
- **QR Code Integration**: Scan and generate QR codes for quick payments
- **Refund Protection**: Recover unclaimed funds automatically
- **Transaction History**: Complete audit trail of all transfers

### 👥 Group Payments
- **Collaborative Funding**: Split expenses among multiple participants
- **Cross-Chain Contributions**: Accept payments from different networks
- **Automatic Distribution**: Funds released when target amount is reached
- **Real-Time Tracking**: Monitor contributions and progress
- **Flexible Deadlines**: Set custom time limits for group payments
- **Event-Driven Architecture**: Efficient blockchain event monitoring

### 💰 Smart Savings Pots
- **Goal-Based Savings**: Set targets and track progress visually
- **Multi-Chain Support**: Create savings pots on different networks
- **Flexible Contributions**: Add funds at your own pace
- **Emergency Withdrawals**: Access funds when needed
- **Progress Visualization**: Real-time savings growth tracking

### 🔗 Cross-Chain Experience
- **Universal Username**: Single identity across all supported chains
- **Unified Dashboard**: View all activities in one interface
- **Real-Time Balances**: Track assets across all networks
- **Seamless Network Switching**: Change networks without losing context

## 🏗️ Technical Architecture

### Frontend Stack
- **Next.js 14.2.13**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations and transitions
- **Heroicons**: Beautiful SVG icons

### Blockchain Integration
- **Wagmi v2**: React hooks for Ethereum
- **RainbowKit**: Wallet connection UI
- **Ethers.js v5**: Ethereum library for smart contract interaction
- **Multi-Chain Support**: 10+ EVM-compatible networks

### Smart Contracts
- **UsernameRegistry**: Manages username-to-address mappings
- **ProtectedEscrow**: Handles secure transfers with escrow functionality
- **GroupPool**: Manages collaborative group payments
- **SavingsPot**: Implements goal-based savings functionality

## 🔗 Supported Networks

| Network | Type | Chain ID | Status |
|---------|------|----------|--------|
| Ethereum Sepolia | Testnet | 11155111 | ✅ Active |
| Electroneum Mainnet | Mainnet | 52014 | ✅ Active |
| Electroneum Testnet | Testnet | 5201420 | ✅ Active |
| EDU Chain Mainnet | Mainnet | 41923 | ✅ Active |
| EDU Chain Testnet | Testnet | 656476 | ✅ Active |
| NeoX Testnet | Testnet | 12227332 | ✅ Active |
| KAIA Testnet | Testnet | 1001 | ✅ Active |
| Ancient8 Testnet | Testnet | 28122024 | ✅ Active |
| Mantle Sepolia | Testnet | 5003 | ✅ Active |
| Linea Sepolia | Testnet | 59141 | ✅ Active |
| Creator Chain Testnet | Testnet | 66665 | ✅ Active |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask or compatible wallet
- Testnet tokens for testing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/guptashrey458/Blockchain-Payement.git
   cd Blockchain-Payement
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
   NEXT_PUBLIC_SEPOLIA_RPC=your_sepolia_rpc_url
   NEXT_PUBLIC_LINEA_SEPOLIA_RPC_URL=your_linea_rpc_url
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Smart Contract Deployment

The application includes Foundry-based smart contracts for deployment:

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Deploy contracts
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC --broadcast --verify
```

## 📱 Usage Guide

### 1. Connect Your Wallet
- Click "Connect Wallet" in the top navigation
- Select your preferred wallet (MetaMask, WalletConnect, etc.)
- Choose your desired blockchain network

### 2. Register a Username
- Navigate to Profile section
- Enter your desired username
- Confirm the transaction to register

### 3. Send Protected Transfers
- Go to Transfer section
- Enter recipient (username, address, or scan QR)
- Specify amount and add optional remarks
- Confirm the transaction

### 4. Create Group Payments
- Navigate to Group Payments
- Click "Create New Group Payment"
- Set target amount, deadline, and participant count
- Share the payment link with contributors

### 5. Set Up Savings Pots
- Go to Savings Pots section
- Click "Create New Pot"
- Set your savings target
- Start contributing to reach your goal

## 🔧 Development

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard pages
│   ├── group-payments/    # Group payment pages
│   ├── transfer/          # Transfer pages
│   └── savings-pots/      # Savings pot pages
├── components/            # Reusable React components
├── context/              # React context providers
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
    ├── contract.ts       # Smart contract interactions
    ├── groupList.ts      # Group payment utilities
    ├── savings.ts        # Savings pot utilities
    └── deployments/      # Contract deployment addresses
```

### Key Components
- **WalletContext**: Manages wallet connection and state
- **ChainSelector**: Network switching interface
- **QRScanner**: QR code scanning functionality
- **DashboardSidebar**: Navigation sidebar

### Smart Contract Integration
- **Contract Utility**: Centralized smart contract interaction layer
- **Event Monitoring**: Real-time blockchain event tracking
- **Chunked Log Queries**: Efficient historical data retrieval
- **Multi-Chain Support**: Network-specific contract deployments

## 🔒 Security Features

- **Non-Custodial**: Users maintain full control of their funds
- **Escrow Protection**: Funds held securely until claimed
- **Smart Contract Audits**: Rigorous security testing
- **Private Key Security**: Environment variables properly managed
- **Transaction Validation**: Comprehensive input validation
- **Error Handling**: Graceful error management and user feedback

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### Smart Contract Tests
```bash
cd contracts
forge test
```

## 📊 Performance Optimizations

- **Chunked Log Queries**: Prevents RPC timeout issues
- **Event-Driven Updates**: Real-time data synchronization
- **Lazy Loading**: Optimized component loading
- **Caching**: Efficient data caching strategies
- **Bundle Optimization**: Minimized JavaScript bundles

## 🐛 Troubleshooting

### Common Issues

1. **"Function not exported" errors**
   - Clear Next.js cache: `rm -rf .next`
   - Restart development server

2. **Wallet connection issues**
   - Ensure MetaMask is unlocked
   - Check network configuration
   - Verify RPC URLs in environment variables

3. **Transaction failures**
   - Check sufficient gas fees
   - Verify network compatibility
   - Ensure contract addresses are correct

4. **Group payments not showing**
   - Use the new `getUserGroupPayments` utility
   - Check blockchain event logs
   - Verify deployment addresses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ethers.js** for Ethereum interaction
- **Wagmi** for React hooks
- **RainbowKit** for wallet connection UI
- **Next.js** for the React framework
- **Tailwind CSS** for styling
- **Framer Motion** for animations

## 📞 Support

For support, questions, or contributions:

- **Issues**: [GitHub Issues](https://github.com/guptashrey458/Blockchain-Payement/issues)
- **Discussions**: [GitHub Discussions](https://github.com/guptashrey458/Blockchain-Payement/discussions)

---

<div align="center">
  <h3>🚀 Revolutionizing secure multi-chain asset management</h3>
  <p>Built with ❤️ for the decentralized future</p>
</div>
