import React from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import EditorWindow from "./windows/EditorWindow";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EditorWindow />
  </React.StrictMode>
);
