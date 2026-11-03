import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthLoadingScreen } from './components/auth/AuthLoadingScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider } from './contexts/AuthContext';

const ApplicationsPage = lazy(() =>
  import('./pages/ApplicationsPage').then((module) => ({
    default: module.ApplicationsPage,
  })),
);
const ApplicationDetailPage = lazy(() =>
  import('./pages/ApplicationDetailPage').then((module) => ({
    default: module.ApplicationDetailPage,
  })),
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage').then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const TermsPage = lazy(() =>
  import('./pages/TermsPage').then((module) => ({
    default: module.TermsPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
);

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<AuthLoadingScreen />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/verificar-email" element={<VerifyEmailPage />} />
            <Route path="/termos" element={<TermsPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route
                  index
                  element={<Navigate to="/candidaturas" replace />}
                />
                <Route path="candidaturas" element={<ApplicationsPage />} />
                <Route
                  path="candidaturas/:id"
                  element={<ApplicationDetailPage />}
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
