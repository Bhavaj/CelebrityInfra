import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const style = document.createElement("style");
style.textContent = `
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{background:#F7F4EC;-webkit-text-size-adjust:100%}

  /* Card hover lift — transform + soft navy shadow only, so inline borders are never overridden */
  .cip-card{transition:transform .18s ease, box-shadow .18s ease}
  @media (hover:hover){
    .cip-card-h:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(10,26,63,.10)}
  }

  /* Buttons & interactive elements ease their states */
  button{transition:transform .12s ease, box-shadow .18s ease, opacity .18s ease, background .18s ease}
  @media (hover:hover){ button:not(:disabled):hover{transform:translateY(-1px)} }

  /* Thin branded scrollbar for horizontal scroll strips (tables, tree) */
  .cip-scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .cip-scroll-x::-webkit-scrollbar{height:7px}
  .cip-scroll-x::-webkit-scrollbar-track{background:transparent}
  .cip-scroll-x::-webkit-scrollbar-thumb{background:#E4DCC4;border-radius:20px}
  .cip-scroll-x::-webkit-scrollbar-thumb:hover{background:#C99A3B}
  .cip-scroll-x{scrollbar-width:thin;scrollbar-color:#E4DCC4 transparent}

  /* Tab strip: single scrollable row on mobile, hidden scrollbar for a clean editorial bar */
  .cip-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .cip-tabs::-webkit-scrollbar{display:none}

  /* Focus rings for the inline-styled inputs/selects — gold, subtle */
  input:focus, select:focus, textarea:focus{
    outline:none;border-color:#C99A3B !important;box-shadow:0 0 0 3px rgba(201,154,59,.18)
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
