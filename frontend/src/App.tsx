import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetCredentialsPage } from './pages/ResetCredentialsPage';
import { TripsPage } from './pages/TripsPage';
import { TripPlannerPage } from './pages/TripPlannerPage';
import { CityPlannerPage } from './pages/CityPlannerPage';
import { Layout } from './components/Layout';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-credentials" element={<ResetCredentialsPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout>
              <TripsPage />
            </Layout>
          </Protected>
        }
      />
      <Route
        path="/trips/:tripId"
        element={
          <Protected>
            <Layout fullHeight>
              <TripPlannerPage />
            </Layout>
          </Protected>
        }
      />
      <Route
        path="/trips/:tripId/cities/:cityId"
        element={
          <Protected>
            <Layout fullHeight>
              <CityPlannerPage />
            </Layout>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
