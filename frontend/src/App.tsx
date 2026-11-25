import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";

import { Shell } from "./components/layout/Shell";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import EntityDetail from "./pages/EntityDetail";
import IncidentDetail from "./pages/IncidentDetail";
import Incidents from "./pages/Incidents";
import Items from "./pages/Items";
import Regulations from "./pages/Regulations";
import SearchResults from "./pages/SearchResults";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Standards from "./pages/Standards";
import { STATIC_MODE } from "./lib/env";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="regulatory" element={<Regulations />} />
          <Route path="standards" element={<Standards />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="items" element={<Items />} />
          <Route path="entities/:slug" element={<EntityDetail />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="about" element={<About />} />
          {/* Source health lives on About (DEC-033); the local app keeps Settings. */}
          <Route path="settings" element={STATIC_MODE ? <Navigate to="/about#sources" replace /> : <Settings />} />
          <Route path="sources" element={<Navigate to={STATIC_MODE ? "/about#sources" : "/settings"} replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
