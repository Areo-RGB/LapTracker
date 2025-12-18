import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register service worker with auto-update check
const updateSW = registerSW({
  onNeedRefresh() {
    // Show update notification
    const toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border: 1px solid #06b6d4;
        border-radius: 16px;
        padding: 16px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.2);
        z-index: 10000;
        font-family: Inter, sans-serif;
        animation: slideUp 0.3s ease-out;
      ">
        <style>
          @keyframes slideUp {
            from { transform: translateX(-50%) translateY(100px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        </style>
        <div style="color: #94a3b8; font-size: 14px;">
          <strong style="color: #06b6d4;">Update available!</strong>
          <br><span style="font-size: 12px;">New version ready to install</span>
        </div>
        <button id="pwa-update-btn" style="
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(6,182,212,0.3);
        ">Update Now</button>
        <button id="pwa-dismiss-btn" style="
          background: transparent;
          color: #64748b;
          border: none;
          padding: 8px;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        ">✕</button>
      </div>
    `;
    document.body.appendChild(toast);

    document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
      updateSW(true); // Force reload with new SW
    });

    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      toast.remove();
    });
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);