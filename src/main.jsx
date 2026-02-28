import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { APP_BRAND } from '@/config/appPaths'
import '@/index.css'

document.title = APP_BRAND.TITLE;

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
