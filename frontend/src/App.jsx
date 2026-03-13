import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import JournalPage from './pages/JournalPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

export default function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem('arvyax_userId') || '');

  useEffect(() => {
    if (userId) localStorage.setItem('arvyax_userId', userId);
  }, [userId]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/"
          element={
            userId
              ? <Navigate to="/journal" replace />
              : <LoginPage onLogin={setUserId} />
          }
        />
        <Route
          path="/journal"
          element={
            userId
              ? <JournalPage userId={userId} onLogout={() => { setUserId(''); localStorage.removeItem('arvyax_userId'); }} />
              : <Navigate to="/" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
