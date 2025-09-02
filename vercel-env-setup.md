# Vercel Environment Variables Setup

You'll need to set these environment variables in your Vercel dashboard:

## Required Environment Variables:

```
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_SEPOLIA_RPC=https://ethereum-sepolia.publicnode.com
NEXT_PUBLIC_LINEA_SEPOLIA_RPC_URL=https://rpc.linea.build/sepolia
```

## How to get WalletConnect Project ID:
1. Go to https://cloud.walletconnect.com/
2. Create an account or sign in
3. Create a new project
4. Copy the Project ID

## Setting Environment Variables in Vercel:
1. Go to your project dashboard in Vercel
2. Click on "Settings" tab
3. Click on "Environment Variables"
4. Add each variable with its value
5. Make sure to set them for "Production", "Preview", and "Development"
