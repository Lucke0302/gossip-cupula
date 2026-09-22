import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FeedSkeleton } from './components/Skeleton';
import { Toaster } from './components/Toaster';

/* Cada rota vira um chunk. O feed é o que quase todo mundo abre primeiro. */
const FeedPage = lazy(() => import('./pages/FeedPage'));
const PostPage = lazy(() => import('./pages/PostPage'));
const NewPostPage = lazy(() => import('./pages/NewPostPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const PendingPage = lazy(() => import('./pages/PendingPage'));
const LinksPage = lazy(() => import('./pages/LinksPage'));
const PhotosPage = lazy(() => import('./pages/PhotosPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RouteFallback() {
  return (
    <Layout>
      <FeedSkeleton />
    </Layout>
  );
}

export default function App() {
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/conta-pendente" element={<PendingPage />} />

          {/*
            Tudo que lê dado da cúpula fica atrás do login: o backend exige
            [Authorize] em todas as rotas de dados, então uma tela pública
            só conseguiria mostrar 401. Veja a nota no README.
          */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/post/:id" element={<PostPage />} />
            <Route path="/novo" element={<NewPostPage />} />
            <Route path="/fotos" element={<PhotosPage />} />
            <Route path="/links" element={<LinksPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <Toaster />
    </>
  );
}
