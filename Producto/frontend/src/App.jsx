import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Landing        from './pages/Landing'
import PrivacyPolicy  from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Auth          from './pages/Auth'
import Onboarding    from './pages/Onboarding'
import MiAdn         from './pages/MiAdn'
import Explore       from './pages/Explore'
import Profile       from './pages/Profile'
import Messages      from './pages/Messages'
import Tocatas       from './pages/Tocatas'
import Help          from './pages/Help'
import Notifications from './pages/Notifications'
import Settings      from './pages/Settings'
import MainLayout    from './layouts/MainLayout'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/"        element={<Landing />} />
      <Route path="/auth"    element={<Auth />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms"   element={<TermsOfService />} />

      {/* Onboarding — requiere sesión pero layout propio (oscuro) */}
      <Route
        path="/onboarding"
        element={
          <PrivateRoute>
            <Onboarding />
          </PrivateRoute>
        }
      />

      {/* Rutas privadas — MainLayout provee Sidebar + Footer */}
      <Route
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route path="/mi-adn"        element={<MiAdn />}         />
        <Route path="/profile"       element={<Profile />}       />
        <Route path="/explore"       element={<Explore />}       />
        <Route path="/messages"      element={<Messages />}      />
        <Route path="/tocatas"       element={<Tocatas />}       />
        <Route path="/help"          element={<Help />}          />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings"      element={<Settings />}      />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
