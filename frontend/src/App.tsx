import { lazy, Suspense, useEffect, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route, useLocation, matchPath, Navigate, useParams } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import ArchiveWidget from './components/ArchiveWidget';
import { useAuth } from './hooks/useAuth';
import { useScrollRestore } from './hooks/useScrollRestore';

const Home = lazy(() => import('./pages/Home'));
const Post = lazy(() => import('./pages/Post'));
const About = lazy(() => import('./pages/About'));
const Friends = lazy(() => import('./pages/Friends'));
const Moments = lazy(() => import('./pages/Moments'));
const Guestbook = lazy(() => import('./pages/Guestbook'));
const Editor = lazy(() => import('./components/Editor'));
const Entry = lazy(() => import('./pages/Entry'));
const Login = lazy(() => import('./pages/Login'));
const APP_NAME = 'ユリカのブログ';

function LegacyTagRedirect() {
  const { tag } = useParams();
  return <Navigate to={`/posts?tag=${encodeURIComponent(tag || '')}`} replace />;
}

function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation();
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return children;
}

function AppLayout() {
  const location = useLocation();
  useScrollRestore();
  const isLanding = location.pathname === '/';
  const isMomentsPage = location.pathname === '/moments';
  const isPostPage = Boolean(matchPath('/post/:id', location.pathname));
  const isGuestbookPage = location.pathname === '/guestbook';
  const useFullBleedShell = isLanding || isMomentsPage || isPostPage || isGuestbookPage;
  const showSidebar = Boolean(
    location.pathname === '/about',
  );
  const showArchive = Boolean(
    location.pathname === '/posts',
  );
  const contentShellClass = showArchive
    ? 'grow w-full max-w-[92rem] mx-auto px-5 lg:px-6 py-10 lg:py-12'
    : 'grow w-full max-w-7xl mx-auto px-4 py-8';
  const routes = (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>}>
      <Routes>
        <Route path="/" element={<Entry />} />
        <Route path="/posts" element={<Home />} />
        <Route path="/post/:id" element={<Post />} />
        <Route path="/tag/:tag" element={<LegacyTagRedirect />} />
        <Route path="/tags" element={<Navigate to="/posts" replace />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/moments" element={<Moments />} />
        <Route path="/guestbook" element={<Guestbook />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/editor"
          element={(
            <RequireAuth>
              <Editor />
            </RequireAuth>
          )}
        />
        <Route
          path="/editor/:id"
          element={(
            <RequireAuth>
              <Editor />
            </RequireAuth>
          )}
        />
      </Routes>
    </Suspense>
  );

  useEffect(() => {
    const isPost = Boolean(matchPath('/post/:id', location.pathname));
    const isEditorEdit = Boolean(matchPath('/editor/:id', location.pathname));
    const params = new URLSearchParams(location.search);
    const searchValue = params.get('search')?.trim();
    const tagValue = params.get('tag')?.trim();
    const categoryValue = params.get('category')?.trim();

    let pageTitle = APP_NAME;

    if (location.pathname === '/') {
      pageTitle = `Home | ${APP_NAME}`;
    } else if (location.pathname === '/posts') {
      if (searchValue) {
        pageTitle = `Search: ${searchValue} | ${APP_NAME}`;
      } else if (tagValue && categoryValue) {
        pageTitle = `${categoryValue} / ${tagValue} | ${APP_NAME}`;
      } else if (tagValue) {
        pageTitle = `Tag: ${tagValue} | ${APP_NAME}`;
      } else if (categoryValue) {
        pageTitle = `Category: ${categoryValue} | ${APP_NAME}`;
      } else {
        pageTitle = `Articles | ${APP_NAME}`;
      }
    } else if (isPost) {
      pageTitle = `Post | ${APP_NAME}`;
    } else if (location.pathname === '/friends') {
      pageTitle = `Friends | ${APP_NAME}`;
    } else if (location.pathname === '/moments') {
      pageTitle = `Moments | ${APP_NAME}`;
    } else if (location.pathname === '/guestbook') {
      pageTitle = `Guestbook | ${APP_NAME}`;
    } else if (location.pathname === '/about') {
      pageTitle = `About | ${APP_NAME}`;
    } else if (location.pathname === '/login') {
      pageTitle = `Login | ${APP_NAME}`;
    } else if (location.pathname === '/editor') {
      pageTitle = `Write | ${APP_NAME}`;
    } else if (isEditorEdit) {
      pageTitle = `Edit Article | ${APP_NAME}`;
    }

    document.title = pageTitle;
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-950/50 transition-colors duration-300">
      <Header />

      {useFullBleedShell ? (
        <main className="grow w-full">{routes}</main>
      ) : (
        <div className="grow flex">
          {showArchive && (
            <aside
              className="hidden lg:block w-80 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-slate-100/50 dark:bg-gray-900/30 backdrop-blur-sm overflow-y-auto sticky"
              style={{ top: '1.5rem', height: 'calc(100vh - 3rem)' }}
            >
              <div className="pt-4 px-6 pb-8">
                <ArchiveWidget />
              </div>
            </aside>
          )}

          <div className={contentShellClass}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <main className={showSidebar ? 'lg:col-span-8' : 'lg:col-span-12'}>{routes}</main>

              {showSidebar && (
                <aside className="lg:col-span-4 space-y-8">
                  <div className="sticky top-24">
                    <Sidebar />
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
