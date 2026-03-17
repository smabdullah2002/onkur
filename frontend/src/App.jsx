
import { useState } from 'react'
import './App.css'
import OnkurPlantManager from './components/IdentifierPage/Onkurplantmanager'
import OnkurRoutinePage from './components/RoutinePage/OnkurRoutinePage'

function App() {
  const [page, setPage] = useState('plants')


  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#2a3d2a] bg-[#0f1a10]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="font-serif text-lg font-bold text-[#b8e0a0]">onkur</h1>
          <div className="flex gap-2 rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] p-1">
            <button
              onClick={() => setPage('plants')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                page === 'plants' ? 'bg-[#5c9e4a] text-white' : 'text-[#8ab87a]'
              }`}
            >
              Plant Manager
            </button>
            <button
              onClick={() => setPage('routine')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                page === 'routine' ? 'bg-[#5c9e4a] text-white' : 'text-[#8ab87a]'
              }`}
            >
              Routine
            </button>
          </div>
        </div>
      </div>

      {page === 'plants' ? <OnkurPlantManager /> : <OnkurRoutinePage />}

    </>
  )
}

export default App
