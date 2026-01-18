import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import './index.css';


// Polyfill global for Gun.js
(window as any).global = window;

// With the new Vite configuration, we no longer need to manually load scripts
// or handle global variables. The application now uses standard ES module imports.

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  // If the root element is missing, log an error and display a message.
  console.error("Fatal Error: Could not find root element to mount to.");
  document.body.innerHTML = `
    <div style="padding: 2rem; font-family: sans-serif; text-align: center;">
      <h2>Application Mount Error</h2>
      <p>The required DOM element with ID 'root' was not found.</p>
    </div>
  `;
}
