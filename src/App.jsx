function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black text-white">
      {/* The RIM Logo: Simple, Industrial, Wide */}
      <div className="mb-8 text-center">
        <h1 className="text-6xl font-black tracking-[0.2em] text-white mb-2">
          RIM
        </h1>
        <p className="text-xs text-gray-500 tracking-widest uppercase">
          Decentralized Intelligence Grid
        </p>
      </div>

      {/* The Status Indicator */}
      <div className="flex items-center space-x-2 mb-12 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-400 font-mono">SYSTEM ONLINE</span>
      </div>
      
      {/* The Action Button */}
      <button className="bg-white text-black font-bold py-4 px-10 rounded-none hover:bg-gray-200 transition-all tracking-wider">
        INITIALIZE UPLINK
      </button>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-[10px] text-gray-700 font-mono">
          RIM PROTOCOL v1.0 • $RIM
        </p>
      </div>
    </div>
  )
}

export default App