import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import AppLoader from './components/AppLoader.jsx'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <AppLoader>
      <App />
    </AppLoader>
  </AuthProvider>
)