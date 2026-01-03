import { PageRouter } from "@/router/page/page-router";
import { SnackbarsProvider } from "@dimasbaguspm/versaur";
import { StrictMode } from "react";

const App = () => {
  return (
    <StrictMode>
      <SnackbarsProvider>
        <PageRouter />
      </SnackbarsProvider>
    </StrictMode>
  );
};

export default App;
