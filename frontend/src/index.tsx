// src/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const basename = process.env.NODE_ENV === 'production' ? '/Lab-Assistant' : '/';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  // <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  // </React.StrictMode>,
);

// 서비스 워커 등록
serviceWorkerRegistration.register();