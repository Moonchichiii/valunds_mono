import { Layout } from "@/app/layouts/Layout";
import { Home } from "@/app/pages/Home";
import { LoginPage } from "@/features/accounts/pages/LoginPage";
import { RegisterPage } from "@/features/accounts/pages/RegisterPage";
import { VerifyEmailPage } from "@/features/accounts/pages/VerifyEmailPage";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { NotFoundPage } from "@/shared/components/NotFoundPage";
import "@/styles/index.css";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { lazy, type ReactElement, type ReactNode, Suspense } from "react";

// Lazy load non-critical pages
const About = lazy(() =>
  import("@/app/pages/About").then((module) => ({ default: module.About }))
);
const FindTalent = lazy(() =>
  import("@/app/pages/FindTalent").then((module) => ({
    default: module.FindTalent,
  }))
);
const Professionals = lazy(() =>
  import("@/app/pages/Professionals").then((module) => ({
    default: module.Professionals,
  }))
);
const Contact = lazy(() =>
  import("@/app/pages/Contact").then((module) => ({ default: module.Contact }))
);
const Dashboard = lazy(() => import("@/app/pages/Dashboard"));

// NEW: Import the new page
const CheckEmail = lazy(() =>
  import("@/features/accounts/pages/CheckEmailPage.tsx").then((module) => ({
    default: module.CheckEmailPage,
  }))
);

// Loading fallback
const LoadingSpinner = (): ReactElement => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
    <span className="ml-2 text-text-secondary">Loading...</span>
  </div>
);

// Suspense wrapper
const SuspenseWrapper = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => (
  <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
);

// Root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFoundPage,
});

// Main layout (marketing pages)
const mainLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "main-layout",
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
  errorComponent: ErrorBoundary,
});

// Marketing pages
const indexRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: "/",
  component: Home,
});

const aboutRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: "/about",
  component: () => (
    <SuspenseWrapper>
      <About />
    </SuspenseWrapper>
  ),
});

const findTalentRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: "/find-talent",
  component: () => (
    <SuspenseWrapper>
      <FindTalent />
    </SuspenseWrapper>
  ),
});

const professionalsRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: "/professionals",
  component: () => (
    <SuspenseWrapper>
      <Professionals />
    </SuspenseWrapper>
  ),
});

const contactRoute = createRoute({
  getParentRoute: () => mainLayoutRoute,
  path: "/contact",
  component: () => (
    <SuspenseWrapper>
      <Contact />
    </SuspenseWrapper>
  ),
});

// Auth routes (without main layout)
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth-layout",
  component: () => <Outlet />,
  errorComponent: ErrorBoundary,
});

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/register",
  component: RegisterPage,
});

// ✅ NEW: Email verification route
const verifyEmailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/verify-email/$token",
  component: VerifyEmailPage,
});

// ✅ NEW: Check email route (uses auth layout)
const checkEmailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/check-email",
  component: () => (
    <SuspenseWrapper>
      <CheckEmail />
    </SuspenseWrapper>
  ),
});

// Dashboard route
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <SuspenseWrapper>
      <Dashboard />
    </SuspenseWrapper>
  ),
  errorComponent: ErrorBoundary,
});

// Build route tree
const routeTree = rootRoute.addChildren([
  mainLayoutRoute.addChildren([
    indexRoute,
    aboutRoute,
    findTalentRoute,
    professionalsRoute,
    contactRoute,
  ]),
  // Auth children now include the new checkEmailRoute
  authLayoutRoute.addChildren([
    loginRoute,
    registerRoute,
    verifyEmailRoute,
    checkEmailRoute,
  ]),
  dashboardRoute,
]);

// Create router
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  defaultErrorComponent: ErrorBoundary,
  defaultNotFoundComponent: NotFoundPage,
});

// Type registration
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App(): ReactElement {
  return <RouterProvider router={router} />;
}

export default App;
