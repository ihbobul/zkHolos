import React, { useState } from 'react'
import { ElectionList } from './components/ElectionList'
import { ElectionDetails } from './components/ElectionDetails'
import { CreateElection } from './components/CreateElection'
import { Button } from './components/ui/button'
import './App.css'

type View = 'list' | 'details' | 'create'

function App() {
  const [currentView, setCurrentView] = useState<View>('list')
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null)

  const handleSelectElection = (electionId: number) => {
    setSelectedElectionId(electionId)
    setCurrentView('details')
  }

  const handleCreateSuccess = (electionId: number) => {
    setSelectedElectionId(electionId)
    setCurrentView('details')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">zkHolos</h1>
            <div className="space-x-4">
              <Button
                variant={currentView === 'list' ? 'default' : 'outline'}
                onClick={() => setCurrentView('list')}
              >
                Elections
              </Button>
              <Button
                variant={currentView === 'create' ? 'default' : 'outline'}
                onClick={() => setCurrentView('create')}
              >
                Create Election
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'list' && (
          <ElectionList onSelectElection={handleSelectElection} />
        )}
        {currentView === 'details' && selectedElectionId !== null && (
          <ElectionDetails electionId={selectedElectionId} />
        )}
        {currentView === 'create' && (
          <CreateElection onSuccess={handleCreateSuccess} />
        )}
      </main>
    </div>
  )
}

export default App
