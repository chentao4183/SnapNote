import React from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import MainApp from "./windows/MainApp";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);
