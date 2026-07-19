import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const style = document.createElement("style");
style.textContent = `
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{
    background:
      radial-gradient(80% 60% at 15% -10%, rgba(201,162,39,.05), transparent 60%),
      radial-gradient(70% 50% at 100% 0%, rgba(47,191,143,.04), transparent 55%),
      #08090D;
    -webkit-text-size-adjust:100%;
  }
  ::selection{background:rgba(201,162,39,.35);color:#F3F0E8}

  /* Card hover lift — transform + gold-tinted glow, so inline borders are never overridden */
  .cip-card{transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease}
  @media (hover:hover){
    .cip-card-h:hover{transform:translateY(-3px);box-shadow:0 16px 36px rgba(0,0,0,.4), 0 0 0 1px rgba(201,162,39,.18)}
  }

  /* Buttons & interactive elements ease their states */
  button{transition:transform .12s ease, box-shadow .18s ease, opacity .18s ease, background .18s ease}
  @media (hover:hover){ button:not(:disabled):hover{transform:translateY(-1px)} }

  /* Thin branded scrollbar for horizontal scroll strips (tables, tree) */
  .cip-scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .cip-scroll-x::-webkit-scrollbar{height:7px}
  .cip-scroll-x::-webkit-scrollbar-track{background:transparent}
  .cip-scroll-x::-webkit-scrollbar-thumb{background:rgba(243,240,232,.16);border-radius:20px}
  .cip-scroll-x::-webkit-scrollbar-thumb:hover{background:#C9A227}
  .cip-scroll-x{scrollbar-width:thin;scrollbar-color:rgba(243,240,232,.16) transparent}

  /* Tab strip: single scrollable row on mobile, hidden scrollbar for a clean editorial bar */
  .cip-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .cip-tabs::-webkit-scrollbar{display:none}

  /* Focus rings for the inline-styled inputs/selects — gold, subtle */
  input:focus, select:focus, textarea:focus{
    outline:none;border-color:#C9A227 !important;box-shadow:0 0 0 3px rgba(201,162,39,.20)
  }
  select option{background:#12151C;color:#F3F0E8}

  /* Quiet row hover for data tables — helps scanning without adding visual noise */
  table tbody tr{transition:background .12s ease}
  @media (hover:hover){ table tbody tr:hover td{background:rgba(243,240,232,.025)} }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
