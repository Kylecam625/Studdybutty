import TTSReader from './components/TTSReader'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ElevenLabs TTS Reader
          </h1>
          <p className="text-gray-600 text-lg">
            Transform your learning with synchronized speech and highlighting
          </p>
        </header>
        <TTSReader />
      </div>
    </div>
  )
}

export default App