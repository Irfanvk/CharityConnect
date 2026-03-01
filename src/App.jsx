import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { APP_PATHS } from '@/config/appPaths';

const { Pages, PUBLIC_PAGES, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const isLoginPath = (pathname = '') => pathname.toLowerCase() === APP_PATHS.LOGIN;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, authError, navigateToLogin, checkAppState } = useAuth();
  const location = useLocation();
  const isOnLoginPage = isLoginPath(location.pathname);
  const returnToParam = new URLSearchParams(location.search).get('returnTo');

  if (isAuthenticated && isOnLoginPage) {
    const target = returnToParam && !isLoginPath(returnToParam) ? returnToParam : APP_PATHS.HOME;
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
      // Redirect to login automatically only when truly unauthenticated
      if (!isAuthenticated && !isOnLoginPage) {
        const returnTo = `${location.pathname}${location.search}${location.hash}`;
        navigateToLogin(returnTo);
      }
      return null;
    }
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
      
      {/* Protected routes - authentication required */}
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
