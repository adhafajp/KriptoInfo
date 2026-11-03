import { useState } from 'react';
import MessageTab from './components/MessageTab';
import VaultTab from './components/VaultTab';
import StegoTab from './components/StegoTab';
import BlockchainTab from './components/BlockchainTab';

function App() {
  const [activeTab, setActiveTab] = useState('message');

  return (
    <div className="min-h-screen bg-dark-950 text-white p-4">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary-400 mb-2">
          KryptoInfo
        </h1>
        <p className="text-dark-300 text-lg">
          Digital Vault dengan 3-Layer Security
        </p>
      </header>

      <nav className="mb-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { id: 'message', label: 'Pesan Rahasia' },
            { id: 'vault', label: 'Vault Storage' },
            { id: 'stego', label: 'Steganografi' },
            { id: 'blockchain', label: 'Blockchain' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto">
        <div className="p-6 bg-dark-900 border border-dark-800 rounded-lg">
          {activeTab === 'message' && <MessageTab />}
          {activeTab === 'vault' && <VaultTab />}
          {activeTab === 'stego' && <StegoTab />}
          {activeTab === 'blockchain' && <BlockchainTab />}
        </div>
      </main>

      <footer className="mt-10 text-center text-dark-400 text-xs">
        <p>
          Sistem Kriptografi Tiga Lapis: Vigenere → AES-256-GCM → ChaCha20-Poly1305
        </p>
        <p className="mt-2">
          Dibangun dengan React 18, Express.js, Prisma, dan MariaDB.
          <br />
          Port Backend: <span className="text-primary-400">3001</span> | Port Frontend: <span className="text-primary-400">5174</span>
        </p>
      </footer>
    </div>
  );
}

export default App
