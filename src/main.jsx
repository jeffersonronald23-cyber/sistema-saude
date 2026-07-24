import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // <-- Garanta que essa linha está aqui!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)