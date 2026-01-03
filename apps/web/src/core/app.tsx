import { PageRouter } from "@/router/page/page-router";
import { SnackbarsProvider } from "@dimasbaguspm/versaur";
import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const App = () => {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SnackbarsProvider>
          <PageRouter />
        </SnackbarsProvider>
      </QueryClientProvider>
    </StrictMode>
  );
};

export default App;
