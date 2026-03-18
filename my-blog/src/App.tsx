import { useEffect, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route, useLocation, matchPath, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Post from './pages/Post';
import About from './pages/About';
import Editor from './components/Editor';
import Entry from './pages/Entry';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';

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
  const isLanding = location.pathname === '/';
  const isPostPage = Boolean(matchPath('/post/:id', location.pathname));
  const useFullBleedShell = isLanding || isPostPage;
  const hideSidebar = Boolean(
    location.pathname === '/' ||
      matchPath('/post/:id', location.pathname) ||
      matchPath('/editor', location.pathname) ||
      matchPath('/editor/:id', location.pathname),
  );
  const routes = (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route path="/posts" element={<Home />} />
      <Route path="/post/:id" element={<Post />} />
      <Route path="/tag/:tag" element={<Home />} />
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
    <div className="min-h-screen flex flex-col bg-gray-50/50 dark:bg-gray-950/50 backdrop-blur-4px transition-colors duration-300">
      <Header />

      {useFullBleedShell ? (
        <main className="grow w-full">{routes}</main>
      ) : (
        <div className="grow w-full max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <main className={hideSidebar ? 'lg:col-span-12' : 'lg:col-span-8'}>{routes}</main>

            {!hideSidebar && (
              <aside className="lg:col-span-4 space-y-8">
                <div className="sticky top-24">
                  <Sidebar />
                </div>
              </aside>
            )}
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
