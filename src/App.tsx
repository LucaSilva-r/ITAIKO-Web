import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { ConfigurePage } from "@/pages/ConfigurePage";
import { LandingPage } from "@/pages/LandingPage";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="itaiko-ui-theme">
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/configure" element={<ConfigurePage />} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
