
import { useState } from 'react'
import './App.css'
import OnkurPlantManager from './components/IdentifierPage/Onkurplantmanager'
import OnkurRoutinePage from './components/RoutinePage/OnkurRoutinePage'

function App() {
  const [page, setPage] = useState('plants')


  return (
    <>
      {page === 'plants' ? (
        <OnkurPlantManager activePage={page} onChangePage={setPage} />
      ) : (
        <OnkurRoutinePage activePage={page} onChangePage={setPage} />
      )}

    </>
  )
}

export default App
