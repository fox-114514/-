import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import Upload from './pages/Upload';
import ShareManager from './pages/ShareManager';
import './styles/global.css';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const key = localStorage.getItem('cloudasset_key');
  if (!key) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><AssetList /></RequireAuth>} />
        <Route path="/upload" element={<RequireAuth><Upload /></RequireAuth>} />
        <Route path="/assets/:id" element={<RequireAuth><AssetDetail /></RequireAuth>} />
        <Route path="/shares" element={<RequireAuth><ShareManager /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
