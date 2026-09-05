import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Toaster } from "sonner";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster position="bottom-right" richColors closeButton theme="light" />
    <App />
  </StrictMode>,
);