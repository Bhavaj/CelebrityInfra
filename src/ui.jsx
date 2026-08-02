import React, { useEffect, useState } from "react";
import logoUrl from "./assets/logo.jpg";

// "Editorial Charcoal" — architectural charcoal canvas, restrained ivory
// type, emerald as the sole primary accent (warm amber + teal reserved for
// secondary status semantics). Display type is Space Grotesk (headings,
// numbers), body/UI copy runs in Inter, JetBrains Mono is reserved for
// truly tabular/code-like content (member codes, ledger figures) instead
// of being the default voice for every button and label. Token names
// (gold/goldLt/emerald/…) are kept stable even though the hues moved, to
// avoid a sweeping rename across every screen.
export const C = {
  bg: "#0F1211", panel: "#161B19", panel2: "#1B211F", field: "#1E2624",
  ink: "#F5F2EA", muted: "#A7B0AB", faint: "#6B7470",
  navy: "#101A33", navy2: "#182848", steel: "#7C96A8",
  gold: "#10B981", goldLt: "#34D399", goldDeep: "#047857", goldSoft: "rgba(16,185,129,.14)",
  emerald: "#D9A441", emeraldLt: "#F0C368", emeraldDeep: "#8A6420", emeraldSoft: "rgba(217,164,65,.14)",
  line: "#2E3835", lineGold: "rgba(16,185,129,.35)",
  green: "#2DD4BF", red: "#E2685A",
};

export const DISPLAY = "'Space Grotesk',sans-serif";
export const FONT = "'Inter',sans-serif";
export const MONO = "'JetBrains Mono',monospace";

// Shared corner radii — a soft, modern scale replacing the old sharp-edged look.
export const R = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
export const goldGradient = `linear-gradient(135deg, ${C.goldLt} 0%, ${C.gold} 55%, ${C.goldDeep} 100%)`;

export const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

// Presentational-only viewport hook: true when the screen is phone-sized (≤640px).
// Used to stack multi-column layouts and adjust padding — no behavior/data impact.
export function useIsMobile(breakpoint = 640) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener ? mql.addEventListener("change", onChange) : mql.addListener(onChange);
    return () => (mql.removeEventListener ? mql.removeEventListener("change", onChange) : mql.removeListener(onChange));
  }, [query]);
  return isMobile;
}

// Pointer-follow 3D tilt — spread the returned handlers onto any element
// carrying the "cip-tilt" class (see main.jsx) for a magnetic, spring-back
// perspective effect. Strength is in degrees of max rotation.
export function useTilt(strength = 7) {
  return {
    onPointerMove: (e) => {
      if (e.pointerType !== "mouse") return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", (px * strength).toFixed(2) + "deg");
      el.style.setProperty("--rx", (-py * strength).toFixed(2) + "deg");
      el.style.setProperty("--tilt-scale", "1.012");
    },
    onPointerLeave: (e) => {
      const el = e.currentTarget;
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--tilt-scale", "1");
    },
  };
}

// Material Symbols glyph — used throughout nav/chrome to match the icon language.
export function Icon({ name, size = 20, style }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

// Horizontal-scroll wrapper so wide tables scroll inside their card instead of breaking layout.
export function TableScroll({ children, minWidth = 560 }) {
  return (
    <div className="cip-scroll-x" style={{ margin: "0 -2px" }}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

// Consistent empty state — centered, muted, with breathing room.
export function Empty({ children }) {
  return (
    <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: "26px 16px", lineHeight: 1.6, fontFamily: FONT }}>
      {children}
    </div>
  );
}

// The real Celebrity Infra crest — a gold laurel medallion on ivory. Rendered
// as a circular medallion (zoomed past the wordmark row) so it reads clearly
// at nav/icon sizes and sits like a seal against the dark UI.
export function Crest({ size = 34 }) {
  return (
    <div
      style={{
        width: size, height: size, flex: "none", borderRadius: "50%", overflow: "hidden",
        background: "#F3EFE2", border: `1.5px solid ${C.gold}`,
        boxShadow: `0 0 ${Math.round(size * 0.4)}px rgba(16,185,129,.35)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <img
        src={logoUrl} alt="Celebrity Infra Pvt Ltd" draggable={false}
        style={{ width: "84%", height: "84%", objectFit: "contain" }}
      />
    </div>
  );
}

const glass = { background: "rgba(22,27,25,.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" };

export function Panel({ title, children, right }) {
  const mobile = useIsMobile();
  const tilt = useTilt(2.5);
  return (
    <div className="cip-card cip-in cip-tilt" {...tilt} style={{ ...glass, border: `1px solid ${C.line}`, borderRadius: R.xl, padding: mobile ? 16 : 24, marginBottom: mobile ? 16 : 20, boxShadow: "0 16px 40px -20px rgba(0,0,0,.6)" }}>
      {title && (
        <div style={{ display: "flex", alignItems: mobile ? "flex-start" : "center", flexDirection: mobile ? "column" : "row", gap: mobile ? 12 : 0, marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${C.line}` }}>
          <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 600, fontSize: 19, letterSpacing: "-0.01em", color: C.ink }}>{title}</h3>
          {right && <div style={{ marginLeft: mobile ? 0 : "auto", width: mobile ? "100%" : "auto" }}>{right}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// Bento-style stat tile — icon chip, big Space Grotesk number, quiet label.
// `icon` is optional so existing call sites keep working unchanged.
export function Stat({ label, value, accent, icon }) {
  const mobile = useIsMobile();
  const barColor = accent || C.gold;
  const tilt = useTilt(9);
  return (
    <div className="cip-card cip-card-h cip-in-fast cip-tilt" {...tilt} style={{ ...glass, position: "relative", overflow: "hidden", border: `1px solid ${C.line}`, borderRadius: R.lg, padding: "18px 20px", flex: mobile ? "1 1 100%" : "1 1 170px" }}>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: barColor, opacity: .8 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: R.sm, background: `${barColor}1f`, border: `1px solid ${barColor}55`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name={icon || "monitoring"} size={16} style={{ color: barColor }} />
        </div>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT, fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: accent || C.ink }}>{value}</div>
    </div>
  );
}

// Soft pill chip — tinted fill plus a matching border, reads livelier than a flat outline.
export function Badge({ text, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color, background: `${color}1f`, border: `1px solid ${color}55`,
      padding: "3px 10px", borderRadius: R.pill, fontFamily: FONT, letterSpacing: "0.01em",
    }}>
      {text}
    </span>
  );
}

export function Th({ children, right }) {
  return <th style={{ textAlign: right ? "right" : "left", fontSize: 12, fontWeight: 600, color: C.muted, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap", fontFamily: FONT }}>{children}</th>;
}
export function Td({ children, right, bold }) {
  return <td style={{ textAlign: right ? "right" : "left", padding: "11px 12px", borderBottom: `1px solid ${C.line}`, fontSize: 14, fontWeight: bold ? 600 : 400, color: C.ink, whiteSpace: "nowrap", fontFamily: FONT }}>{children}</td>;
}

// size="md" (default) is the primary CTA treatment — reserve it for the one
// or two primary actions on a screen (Sign in, Create project, Confirm sale).
// size="sm" is a quiet control for row/inline actions in tables and modals.
// Normal-case, medium-weight Inter — not the old all-caps mono chip look.
export function Button({ children, onClick, disabled, kind = "gold", size = "md", type = "button" }) {
  const styles = kind === "gold"
    ? { background: goldGradient, color: "#062B1E", border: "none", fontWeight: 600, boxShadow: "0 6px 20px -4px rgba(16,185,129,.4)" }
    : kind === "ghostLight"
    ? { background: "transparent", color: C.ink, border: `1px solid ${C.line}`, fontWeight: 500 }
    : kind === "danger"
    ? { background: "transparent", color: C.red, border: `1px solid ${C.red}`, fontWeight: 500 }
    : { background: "transparent", color: C.muted, border: `1px solid ${C.line}`, fontWeight: 500 };
  const sizing = size === "sm"
    ? { padding: "7px 14px", fontSize: 13, borderRadius: R.sm }
    : { padding: "11px 22px", fontSize: 14, borderRadius: R.md };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={kind === "gold" && !disabled ? "cip-glow" : undefined}
      style={{ ...styles, ...sizing, fontFamily: FONT, letterSpacing: "0", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all .15s ease" }}>
      {children}
    </button>
  );
}

// Destructive action gated behind an on-brand confirm dialog (replaces the
// native window.confirm(), which broke out of the theme).
export function ConfirmButton({ children, confirmText, onConfirm, kind = "danger", size = "sm", ...props }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button {...props} kind={kind} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      {open && (
        <Modal title="Please confirm" onClose={() => setOpen(false)} maxWidth={420}>
          <p style={{ margin: "0 0 22px", fontFamily: FONT, fontSize: 14.5, color: C.ink, lineHeight: 1.6 }}>{confirmText}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button kind="ghostLight" onClick={() => setOpen(false)}>Cancel</Button>
            <Button kind="danger" onClick={() => { setOpen(false); onConfirm(); }}>Confirm</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Field({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 13, color: C.muted, marginBottom: 6, fontFamily: FONT, fontWeight: 500 }}>{label}</span>
      <input {...props}
        style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: R.sm, fontFamily: FONT, fontSize: 15, color: C.ink, background: C.field }} />
    </label>
  );
}

// compact=true drops the block label/margin for inline use (filter bars, table cells)
export function Select({ label, value, onChange, options, placeholder, compact }) {
  return (
    <label style={{ display: "block", marginBottom: compact ? 0 : 14 }}>
      {label && <span style={{ display: "block", fontSize: 13, color: C.muted, marginBottom: 6, fontFamily: FONT, fontWeight: 500 }}>{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: compact ? "auto" : "100%", padding: compact ? "8px 10px" : "11px 13px", border: `1px solid ${C.line}`, borderRadius: R.sm, fontFamily: FONT, fontSize: compact ? 13.5 : 15, color: C.ink, background: C.field, cursor: "pointer" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

// Drill-down panel that opens in place over the content.
export function Modal({ title, onClose, children, maxWidth = 620 }) {
  const mobile = useIsMobile();
  return (
    <div onClick={onClose} className="cip-in-fade"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(3px)", display: "flex", alignItems: mobile ? "flex-end" : "flex-start", justifyContent: "center", padding: mobile ? 0 : "48px 16px", zIndex: 100, overflowY: mobile ? "hidden" : "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className={mobile ? "cip-in-sheet" : "cip-in-scale"}
        style={{ ...glass, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.goldLt}`,
          borderRadius: mobile ? `${R.lg}px ${R.lg}px 0 0` : R.lg, width: "100%", maxWidth: mobile ? "none" : maxWidth,
          maxHeight: mobile ? "88dvh" : "none", overflowY: mobile ? "auto" : "visible",
          boxShadow: "0 24px 60px -20px rgba(0,0,0,.6)",
          padding: mobile ? "18px 18px calc(18px + env(safe-area-inset-bottom))" : 26 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18, gap: 12 }}>
          <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 600, fontSize: mobile ? 19 : 22, color: C.ink }}>{title}</h3>
          <button onClick={onClose} aria-label="Close"
            style={{ marginLeft: "auto", flexShrink: 0, background: "none", border: `1px solid ${C.line}`, borderRadius: R.pill, width: 34, height: 34, cursor: "pointer", color: C.muted }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  const mobile = useIsMobile();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", border: `1px solid ${C.line}`, background: C.field, borderRadius: R.sm, minWidth: mobile ? 0 : 220, width: mobile ? "100%" : undefined }}>
      <Icon name="search" size={16} style={{ color: C.muted }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Search…"}
        style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", fontFamily: FONT, fontSize: 14, color: C.ink, outline: "none" }} />
    </div>
  );
}

// Mobile stand-in for a table row — a tappable bordered card used when a
// data table's columns would otherwise force horizontal scrolling on phones.
export function RowCard({ children, onClick }) {
  const tilt = useTilt(4);
  return (
    <div onClick={onClick} className="cip-card cip-card-h cip-tap cip-in-fast cip-tilt" {...tilt}
      style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: R.md, padding: "13px 14px", marginBottom: 8, cursor: onClick ? "pointer" : "default" }}>
      {children}
    </div>
  );
}

// Label/value pair for the compact card body inside RowCard — mirrors <Td>
// typography at a smaller scale so mobile cards read like a slimmed table row.
export function RowLine({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0", fontSize: 13.5 }}>
      <span style={{ color: C.muted, fontFamily: FONT, fontSize: 12.5, fontWeight: 500, alignSelf: "center" }}>{label}</span>
      <span style={{ color: C.ink, fontWeight: bold ? 700 : 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function KV({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 13, color: C.muted, fontFamily: FONT, fontWeight: 500 }}>{k}</span>
      <span style={{ fontSize: 14, color: C.ink, fontWeight: 500, fontFamily: FONT }}>{v}</span>
    </div>
  );
}
