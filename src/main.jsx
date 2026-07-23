import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const style = document.createElement("style");
style.textContent = `
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{
    font-family:'Hanken Grotesk',sans-serif;
    line-height:1.5;
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
    text-rendering:optimizeLegibility;
    background:#000000;
    -webkit-text-size-adjust:100%;
  }
  ::selection{background:#f2ca50;color:#1A1200}

  .material-symbols-outlined{
    font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24;
  }

  /* Card hover lift — sharp edges, gold-glow border, no rounded shadow */
  .cip-card{transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease}
  @media (hover:hover){
    .cip-card-h:hover{border-color:#f2ca50;box-shadow:0 0 20px rgba(242,202,80,.15)}
  }
  .cip-glow{box-shadow:0 0 0 rgba(242,202,80,0)}
  @media (hover:hover){ .cip-glow:hover{box-shadow:0 0 15px rgba(242,202,80,.35)} }

  /* Buttons & interactive elements ease their states */
  button{transition:transform .12s ease, box-shadow .18s ease, opacity .18s ease, background .18s ease, border-color .18s ease}
  @media (hover:hover){ button:not(:disabled):hover{transform:translateY(-1px)} }

  /* Thin branded scrollbar */
  .cip-scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .cip-scroll-x::-webkit-scrollbar{height:6px;width:6px}
  .cip-scroll-x::-webkit-scrollbar-track{background:#0d0e12}
  .cip-scroll-x::-webkit-scrollbar-thumb{background:#2C2C2E;border-radius:0}
  .cip-scroll-x::-webkit-scrollbar-thumb:hover{background:#f2ca50}
  .cip-scroll-x{scrollbar-width:thin;scrollbar-color:#2C2C2E #0d0e12}
  ::-webkit-scrollbar{width:6px;height:6px}
  ::-webkit-scrollbar-track{background:#0d0e12}
  ::-webkit-scrollbar-thumb{background:#2C2C2E;border-radius:0}
  ::-webkit-scrollbar-thumb:hover{background:#f2ca50}

  /* Tab strip: single scrollable row on mobile, hidden scrollbar for a clean bar */
  .cip-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .cip-tabs::-webkit-scrollbar{display:none}

  /* Focus rings for the inline-styled inputs/selects — gold, sharp */
  input:focus, select:focus, textarea:focus{
    outline:none;border-color:#f2ca50 !important;box-shadow:0 0 0 1px rgba(242,202,80,.35)
  }
  select option{background:#121317;color:#e3e2e7}

  /* Quiet row hover for data tables — helps scanning without adding visual noise */
  table tbody tr{transition:background .12s ease}
  @media (hover:hover){ table tbody tr:hover td{background:rgba(227,226,231,.03)} }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
