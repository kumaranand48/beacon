import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import EventsPage from './pages/Events';
import BehaviorPage from './pages/Behavior';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/behavior" element={<BehaviorPage />} />
            <Route
              path="/settings"
              element={
                <div className="animate-fade-in">
                  <div className="mb-8">
                    <h1 className="text-2xl font-extrabold text-text-primary">
                      Settings
                    </h1>
                    <p className="text-text-secondary text-sm mt-1">
                      Application settings
                    </p>
                  </div>
                  <div className="bg-surface-card rounded-card shadow-card p-12 text-center">
                    <p className="text-text-secondary text-lg font-medium">
                      Settings page coming soon.
                    </p>
                  </div>
                </div>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
