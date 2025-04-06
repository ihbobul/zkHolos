import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { VoterRegistration } from './components/VoterRegistration';
import { VotingForm } from './components/VotingForm';
import { ElectionManagement } from './components/ElectionManagement';
import { ElectionList } from './components/ElectionList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const queryClient = new QueryClient();

function HomePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to zkHolos</CardTitle>
        <CardDescription>
          A secure and transparent voting system powered by zero-knowledge proofs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Features:</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Secure voter registration with ZK verification</li>
            <li>Anonymous voting using zero-knowledge proofs</li>
            <li>Transparent election process</li>
            <li>Real-time results</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function MyVotesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Voting History</CardTitle>
        <CardDescription>
          View your past votes and current voting status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Coming soon: View your voting history with zero-knowledge proof verification</p>
      </CardContent>
    </Card>
  );
}

function App() {
  const { checkAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navbar />
          
          <main className="container mx-auto p-4">
            <Routes>
              <Route path="/" element={<HomePage />} />
              
              <Route 
                path="/register" 
                element={
                  <VoterRegistration onSuccess={() => <Navigate to="/elections" replace />} />
                } 
              />
              
              <Route 
                path="/elections" 
                element={<ElectionList />} 
              />
              
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <ElectionManagement />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/my-votes"
                element={
                  <ProtectedRoute requireVoter>
                    <MyVotesPage />
                  </ProtectedRoute>
                }
              />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
