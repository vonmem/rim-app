import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PrivyProvider } from '@privy-io/react-auth'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrivyProvider
      appId="cmmb7ag9j017y0cl7vvnwgxs4" // 👈 PASTE YOUR PRIVY APP ID HERE
      config={{
        // 🚨 THIS FORCES TELEGRAM TO BE THE PRIMARY LOGIN BUTTON
        loginMethods: ['telegram', 'email', 'wallet'], 
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        // 🚨 ADD THIS SO THE PRIVY MODAL ITSELF DOESN'T CRASH:
        solana: {
          rpcs: ['https://solana-rpc.publicnode.com']
        }
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)