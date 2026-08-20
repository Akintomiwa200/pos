import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppToaster } from "./components/AppToaster";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppToaster />
    <App />
  </StrictMode>,
);
