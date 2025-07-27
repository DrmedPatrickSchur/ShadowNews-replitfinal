import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/components/ui/theme-provider";

/**
 * ShadowNews Client Application Entry Point
 * 
 * This file bootstraps the React application and sets up the root providers:
 * 
 * - ThemeProvider: Manages light/dark theme state with localStorage persistence
 * - React 18 createRoot: Uses the new concurrent rendering features
 * 
 * The theme system allows users to toggle between light and dark modes,
 * with their preference saved in localStorage under "shadownews-theme".
 * Defaults to light theme for better readability of text-heavy content.
 */

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="shadownews-theme">
    <App />
  </ThemeProvider>
);
