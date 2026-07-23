import React from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import ShortcutSettingsWindow from "./windows/ShortcutSettingsWindow";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ShortcutSettingsWindow />
  </React.StrictMode>
);
