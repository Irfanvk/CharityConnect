import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import MemberRequests from './pages/MemberRequests';
import AdminRequests from './pages/AdminRequests';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { APP_PATHS } from '@/config/appPaths';
import { SESSION_EXPIRED_TOAST_KEY } from '@/config/constants';
import { BackendHealthBanner } from '@/components/BackendHealthBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { IOSInstallPrompt } from '@/components/IOSInstallPrompt';
import { AndroidInstallPrompt } from '@/components/AndroidInstallPrompt';
import { NotificationsProvider } from '@/context/NotificationContext';

const LandingPage = lazy(() => import('./pages/Landing'));

const { Pages, PUBLIC_PAGES, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const PUBLIC_ROUTE_PATHS = new Set(
  Object.keys(PUBLIC_PAGES || {}).map((path) => `/${String(path).toLowerCase()}`)
);

const ADMIN_PAGES = new Set(['Members', 'Reports', 'AuditLogs', 'Settings', 'AdminRequests', 'FundUtilization']);
const SUPERADMIN_PAGES = new Set(['SuperadminPanel']);

const canAccessPage = (pageKey, role) => {
  if (SUPERADMIN_PAGES.has(pageKey)) {
    return role === 'superadmin';
  }
  if (ADMIN_PAGES.has(pageKey)) {
    return role === 'admin' || role === 'superadmin';
  }
  return true;
};

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const normalizePathname = (pathname = '') => String(pathname || '').split('?')[0].split('#')[0].toLowerCase();
const isLoginPath = (pathname = '') => normalizePathname(pathname) === APP_PATHS.LOGIN;
const isRootPath = (pathname = '') => normalizePathname(pathname) === '/';
const isPublicPath = (pathname = '') => PUBLIC_ROUTE_PATHS.has(normalizePathname(pathname)) || isRootPath(pathname);
const buildLoginRedirectPath = (location) => {
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return `${APP_PATHS.LOGIN}?returnTo=${encodeURIComponent(returnTo)}`;
};

const SessionExpiredToastBridge = () => {
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoginPath(location.pathname)) {
      return;
    }

    const shouldShowToast = sessionStorage.getItem(SESSION_EXPIRED_TOAST_KEY) === '1';
    if (!shouldShowToast) {
      return;
    }

    sessionStorage.removeItem(SESSION_EXPIRED_TOAST_KEY);
    toast({
      title: 'Session expired',
      description: 'Please sign in again to continue.',
      variant: 'destructive',
    });
  }, [location.pathname, toast]);

  return null;
};

const AuthenticatedApp = () => {
  const { user: authUser, isLoadingAuth, isLoadingPublicSettings, isAuthenticated, authError, checkAppState } = useAuth();
  const location = useLocation();
  const isOnLoginPage = isLoginPath(location.pathname);
  const isOnPublicPage = isPublicPath(location.pathname);
  const returnToParam = new URLSearchParams(location.search).get('returnTo');
  const loginRedirectPath = buildLoginRedirectPath(location);

  if (isAuthenticated && isOnPublicPage && !isRootPath(location.pathname)) {
    const target = returnToParam && !isPublicPath(returnToParam) ? returnToParam : APP_PATHS.HOME;
    return <Navigate to={target} replace />;
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'backend_unreachable') {
      return (
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <Alert variant="destructive">
              <AlertTitle>Backend Unreachable</AlertTitle>
              <AlertDescription>
                {authError.message}
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-end">
              <Button onClick={checkAppState}>Retry</Button>
            </div>
          </div>
        </div>
      );
    } else if (authError.type === 'auth_required') {
      if (!isAuthenticated && !isOnPublicPage) {
        return <Navigate to={loginRedirectPath} replace />;
      }
      return null;
    }
  }

  if (!isAuthenticated && !isOnPublicPage) {
    return <Navigate to={loginRedirectPath} replace />;
  }

  // Render the main app
  return (
    <Routes>
      {/* Public routes - no authentication required */}
      {PUBLIC_PAGES && Object.entries(PUBLIC_PAGES).flatMap(([path, Page]) => {
        const canonical = `/${path}`;
        const lower = `/${path.toLowerCase()}`;
        const routes = [
          <Route key={canonical} path={canonical} element={<Page />} />,
        ];

        if (lower !== canonical) {
          routes.push(
            <Route key={lower} path={lower} element={<Page />} />
          );
        }

        return routes;
      })}
      
      {/* Landing page - public root route */}
      <Route path="/" element={
        isAuthenticated ? (
          <Navigate to={APP_PATHS.HOME} replace />
        ) : (
          <Suspense fallback={
            <div className="fixed inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
          }>
            <LandingPage />
          </Suspense>
        )
      } />

      {/* Protected routes - authentication required */}
      <Route path="/dashboard" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            canAccessPage(path, authUser?.role) ? (
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            ) : (
              <Navigate to={APP_PATHS.HOME} replace />
            )
          }
        />
      ))}

      <Route
        path="/requests"
        element={
          <LayoutWrapper currentPageName={'Requests'}>
            <MemberRequests />
          </LayoutWrapper>
        }
      />

      <Route
        path="/admin/requests"
        element={
          canAccessPage('AdminRequests', authUser?.role) ? (
            <LayoutWrapper currentPageName={'AdminRequests'}>
              <AdminRequests />
            </LayoutWrapper>
          ) : (
            <Navigate to={APP_PATHS.HOME} replace />
          )
        }
      />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <NotificationsProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <BackendHealthBanner />
            <OfflineBanner />
            <SessionExpiredToastBridge />
            <NavigationTracker />
            <AuthenticatedApp />
            <IOSInstallPrompt />
            <AndroidInstallPrompt />
          </Router>
        </NotificationsProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
