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
    background:
      radial-gradient(60% 40% at 12% 0%, rgba(242,202,80,.07), transparent 60%),
      radial-gradient(50% 36% at 100% 12%, rgba(47,191,143,.05), transparent 55%),
      #000000;
    background-attachment:fixed;
    -webkit-text-size-adjust:100%;
  }
  ::selection{background:#f2ca50;color:#1A1200}

  .material-symbols-outlined{
    font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24;
  }

  /* Card hover lift — soft rounded edges, gold-glow border and a gentle rise */
  .cip-card{transition:transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s ease, border-color .2s ease}
  @media (hover:hover){
    .cip-card-h:hover{border-color:#f2ca50;box-shadow:0 12px 28px -10px rgba(242,202,80,.25);transform:translateY(-2px)}
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

  /* Keyboard focus ring for buttons/links — gold, only shown for keyboard nav */
  button:focus-visible, a:focus-visible{
    outline:2px solid #f2ca50;outline-offset:2px;border-radius:4px;
  }
  button:focus:not(:focus-visible), a:focus:not(:focus-visible){outline:none}

  /* Quiet row hover for data tables — helps scanning without adding visual noise */
  table tbody tr{transition:background .12s ease}
  @media (hover:hover){ table tbody tr:hover td{background:rgba(227,226,231,.03)} }

  /* ---------- Motion system ---------- */
  html{-webkit-tap-highlight-color:transparent}
  body{overscroll-behavior-y:contain}

  @keyframes cipFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes cipFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes cipScaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
  @keyframes cipSheetUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
  @keyframes cipSlideInLeft{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}

  .cip-in{animation:cipFadeUp .5s cubic-bezier(.16,1,.3,1) both}
  .cip-in-fast{animation:cipFadeUp .38s cubic-bezier(.16,1,.3,1) both}
  .cip-in-fade{animation:cipFadeIn .3s ease both}
  .cip-in-scale{animation:cipScaleIn .28s cubic-bezier(.16,1,.3,1) both}
  .cip-in-left{animation:cipSlideInLeft .32s cubic-bezier(.16,1,.3,1) both}
  .cip-in-sheet{animation:cipSheetUp .32s cubic-bezier(.16,1,.3,1) both}

  @keyframes cipDrawerIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
  .cip-drawer-in{animation:cipDrawerIn .28s cubic-bezier(.16,1,.3,1) both}

  /* Staggered children — apply .cip-stagger to a container of .cip-in items */
  .cip-stagger > *{animation-fill-mode:both}
  .cip-stagger > *:nth-child(1){animation-delay:.02s}
  .cip-stagger > *:nth-child(2){animation-delay:.06s}
  .cip-stagger > *:nth-child(3){animation-delay:.1s}
  .cip-stagger > *:nth-child(4){animation-delay:.14s}
  .cip-stagger > *:nth-child(5){animation-delay:.18s}
  .cip-stagger > *:nth-child(6){animation-delay:.22s}
  .cip-stagger > *:nth-child(n+7){animation-delay:.26s}

  /* Touch/press feedback for buttons and tappable rows */
  button:not(:disabled){-webkit-tap-highlight-color:transparent}
  button:not(:disabled):active{transform:scale(.97)}
  .cip-tap{transition:transform .12s ease, background .15s ease, border-color .15s ease}
  .cip-tap:active{transform:scale(.98)}

  @media (prefers-reduced-motion: reduce){
    .cip-in,.cip-in-fast,.cip-in-fade,.cip-in-scale,.cip-in-left,.cip-in-sheet,.cip-drawer-in{animation:none !important;opacity:1 !important;transform:none !important}
    button:not(:disabled):active,.cip-tap:active{transform:none}
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
