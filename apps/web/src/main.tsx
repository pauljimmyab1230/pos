import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize theme from localStorage before rendering
const initTheme = () => {
  try {
    const stored = localStorage.getItem('pos-theme');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  } catch (e) {
    console.error('Error initializing theme:', e);
  }
};

// Apply theme immediately
initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
