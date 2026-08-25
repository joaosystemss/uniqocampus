import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme before render to avoid flash
const storedTheme = localStorage.getItem("uniqo-theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
if (storedTheme === "dark" || (!storedTheme && prefersDark)) {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
