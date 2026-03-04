import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 🚨 IMPORT PRIVY
import { PrivyProvider } from '@privy-io/react-auth'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrivyProvider
      appId="cmmb7ag9j017y0cl7vvnwgxs4" // 👈 PASTE YOUR PRIVY APP ID HERE
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4', // Sonar Rim Cyan
          // logo: 'https://your-logo-url.com', // Optional: drop a logo URL here later
        },
        // 🚨 This tells Privy to generate the invisible wallet
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)