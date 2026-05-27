import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initDb } from './db/db';

// Initialize embedded database with demo data before React renders
initDb().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}).catch(err => {
  console.error("Failed to initialize database", err);
  document.getElementById('root')!.innerHTML = '<div style="padding:20px;color:red">Failed to initialize local DB</div>';
});

