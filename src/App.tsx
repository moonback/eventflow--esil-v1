/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { MobileView } from './pages/MobileView';
import { Inventory } from './pages/Inventory';
import { Planning } from './pages/Planning';
import { Settings } from './pages/Settings';
import { Vehicles } from './pages/Vehicles';
import { Staff } from './pages/Staff';
import { Auth } from './pages/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div></div>;
  }
  
  if (!session) {
    return <Navigate to="/auth" />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="mobile" element={<MobileView />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="planning" element={<Planning />} />
            <Route path="staff" element={<Staff />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
