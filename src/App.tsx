import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ContentView } from './pages/ContentView';
import { AuthCallback } from './pages/AuthCallback';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/content/:id" element={<ContentView />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
          <footer style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '8px 16px',
            background: '#000',
            borderRadius: '20px',
          }}>
            <a 
              href="https://bolt.new"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#fff',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Built with bolt.new ⚡
            </a>
          </footer>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;