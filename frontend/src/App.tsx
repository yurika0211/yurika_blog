import { lazy, Suspense, useEffect, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route, useLocation, matchPath, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import ArchiveWidget from './components/ArchiveWidget';
import { useAuth } from './hooks/useAuth';
import { useScrollRestore } from './hooks/useScrollRestore';

const Home = lazy(() => import('./pages/Home'));
const Post = lazy(() => import('./pages/Post'));
const About = lazy(() => import('./pages/About'));
const Editor = lazy(() => import('./components/Editor'));
const Entry = lazy(() => import('./pages/Entry'));
const Login = lazy(() => import('./pages/Login'));
const Tags = lazy(() => import('./pages/Tags'));

const APP_NAME = 'ユリカのブログ';

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
  const isPostPage = Boolean(matchPath('/post/:id', location.pathname));
  const useFullBleedShell = isLanding || isPostPage;
  const showSidebar = Boolean(
    location.pathname === '/about',
  );
  const showArchive = Boolean(
    location.pathname === '/posts' ||
      matchPath('/tag/:tag', location.pathname),
  );
  const routes = (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-gray-500">加载中...</div>}>
      <Routes>
        <Route path="/" element={<Entry />} />
        <Route path="/posts" element={<Home />} />
        <Route path="/post/:id" element={<Post />} />
        <Route path="/tag/:tag" element={<Home />} />
        <Route path="/tags" element={<Tags />} />
        <Route
          path="/about"
          element={(
            <RequireAuth>
              <About />
            </RequireAuth>
          )}
        />
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
    const tagMatch = matchPath('/tag/:tag', location.pathname);
    const isPost = Boolean(matchPath('/post/:id', location.pathname));
    const isEditorEdit = Boolean(matchPath('/editor/:id', location.pathname));
    const searchValue = new URLSearchParams(location.search).get('search')?.trim();

    let pageTitle = APP_NAME;

    if (location.pathname === '/') {
      pageTitle = `首页 | ${APP_NAME}`;
    } else if (location.pathname === '/posts') {
      pageTitle = searchValue
        ? `搜索：${searchValue} | ${APP_NAME}`
        : `文章列表 | ${APP_NAME}`;
    } else if (tagMatch?.params.tag) {
      const tag = decodeURIComponent(tagMatch.params.tag);
      pageTitle = `标签：${tag} | ${APP_NAME}`;
    } else if (isPost) {
      pageTitle = `文章详情 | ${APP_NAME}`;
    } else if (location.pathname === '/tags') {
      pageTitle = `标签 | ${APP_NAME}`;
    } else if (location.pathname === '/about') {
      pageTitle = `关于 | ${APP_NAME}`;
    } else if (location.pathname === '/login') {
      pageTitle = `登录 | ${APP_NAME}`;
    } else if (location.pathname === '/editor') {
      pageTitle = `写作 | ${APP_NAME}`;
    } else if (isEditorEdit) {
      pageTitle = `编辑文章 | ${APP_NAME}`;
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
            <aside className="hidden lg:block w-72 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-slate-100/50 dark:bg-gray-900/30 backdrop-blur-sm overflow-y-auto sticky top-16 h-[calc(100vh-4rem)]">
              <div className="pt-6 px-5 pb-6">
                <ArchiveWidget />
              </div>
            </aside>
          )}

          <div className="grow w-full max-w-7xl mx-auto px-4 py-8">
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
