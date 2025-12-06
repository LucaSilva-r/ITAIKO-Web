import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { ConfigurePage } from "./pages/ConfigurePage";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/configure" element={<ConfigurePage />} />
      </Routes>
    </ThemeProvider>

  );
}

export default App;
