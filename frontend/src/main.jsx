import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const createRoot = ReactDOM.createRoot || ReactDOM.default?.createRoot || ReactDOM
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
