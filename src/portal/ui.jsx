import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import logoUrl from "./assets/celebrity-logo.png";

// Portal design system. Every color/font resolves to a CSS custom property
// from src/shared/tokens.css (shared with the marketing homepage), plus a
// handful of portal-only `--portal-*` tokens defined in ./global.css. Values
// are `var(...)` strings, so never concatenate hex alpha onto them — use
// `tint(color, pct)` (color-mix) for translucent fills/borders instead.
export const C = {
  bg: "var(--bg)", bg2: "var(--bg-2)", panel: "var(--surface)", panel2: "var(--surface-2)", field: "var(--field)",
  ink: "var(--ivory)", muted: "var(--muted)", faint: "var(--faint)",
  steel: "var(--portal-steel)",
  gold: "var(--gold)", goldLt: "var(--gold-lt)", goldHi: "var(--gold-hi)", goldDeep: "var(--gold-deep)", goldSoft: "var(--portal-gold-soft)",
  wine: "var(--wine)", wineLt: "var(--wine-lt)",
  emerald: "var(--success)", emeraldLt: "var(--success)",
  line: "var(--line)", lineStrong: "var(--line-strong)", lineGold: "var(--line-gold)",
  green: "var(--success)", red: "var(--danger)",
};

export const DISPLAY = "var(--font-display)";
export const FONT = "var(--font-sans)";
export const MONO = "var(--font-mono)";
export const WORDMARK = "var(--font-wordmark)";

// Numeric radii mirror --r-sm/--r-md/--r-lg (inline styles sometimes need
// numbers for compound values like `${R.lg}px ${R.lg}px 0 0`).
export const R = { sm: 6, md: 12, lg: 20, xl: 20, pill: 999 };

export const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// Small uppercase tracked section label (Manrope 600) — the one place the
// portal uses caps, so it reads as structure rather than decoration.
export const LABEL = {
  fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: "var(--tracking-label, 0.16em)",
  textTransform: "uppercase", color: C.faint,
};

export const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
// Plain `date` columns ("2026-08-29") get a local midnight so they don't shift
// a day in IST; `timestamptz` columns (e.g. commissions.paid_at) already carry
// a time and would become "Invalid Date" with the suffix appended.
export const fmtDate = (d) => d ? new Date(String(d).length <= 10 ? d + "T00:00:00" : d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // local date, not UTC

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

export function Icon({ name, size = 20, style, className }) {
  return (
    <span className={className ? `material-symbols-outlined ${className}` : "material-symbols-outlined"} aria-hidden="true" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

export function Label({ children, style }) {
  return <div style={{ ...LABEL, ...style }}>{children}</div>;
}

// Scroll container for data tables: scrolls horizontally on narrow screens
// and vertically past ~70vh so the sticky header row stays in view.
export function TableScroll({ children, minWidth = 560 }) {
  return (
    <div className="cip-table-wrap cip-scroll-x">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div className="cip-empty">
      <span className="cip-empty-rule" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Loading({ label = "Loading" }) {
  return (
    <div className="cip-loading" role="status" aria-live="polite">
      <span className="cip-loading-bar" aria-hidden="true"><span /></span>
      <span>{label}…</span>
    </div>
  );
}

// The crest PNG has a transparent background, so it sits directly on the
// dark UI exactly like the gold mark on the landing page.
export function Crest({ size = 44 }) {
  return (
    <img
      src={logoUrl} alt="Celebrity Infra Pvt Ltd" draggable={false}
      style={{ width: size, height: size, flex: "none", objectFit: "contain" }}
    />
  );
}

export function Panel({ title, children, right, subtitle }) {
  const mobile = useIsMobile();
  return (
    <section className="cip-panel cip-in">
      {title && (
        <div style={{ display: "flex", alignItems: mobile ? "stretch" : "flex-end", flexDirection: mobile ? "column" : "row", gap: mobile ? 14 : 24, marginBottom: mobile ? 16 : 20, paddingBottom: mobile ? 16 : 18, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 500, fontSize: mobile ? 23 : 26, lineHeight: 1.15, color: C.ink }}>{title}</h3>
            {subtitle && <div style={{ fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 1.55, maxWidth: 640 }}>{subtitle}</div>}
          </div>
          {right && <div style={{ marginLeft: mobile ? 0 : "auto", width: mobile ? "100%" : "auto", flex: "none", maxWidth: "100%" }}>{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// Page-level header at the top of every admin/portal screen.
export function PageHeader({ eyebrow, title, subtitle, right }) {
  const mobile = useIsMobile(900);
  return (
    <header style={{ display: "flex", alignItems: mobile ? "stretch" : "flex-end", flexDirection: mobile ? "column" : "row", gap: mobile ? 18 : 32, marginBottom: mobile ? 22 : 32, paddingBottom: mobile ? 20 : 28, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div style={{ ...LABEL, color: C.gold, marginBottom: 12 }}>{eyebrow}</div>}
        <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 500, fontSize: mobile ? 36 : 46, lineHeight: 1.02, color: C.ink, letterSpacing: "-0.01em" }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 15, color: C.muted, marginTop: 10, lineHeight: 1.55, maxWidth: 560 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ marginLeft: mobile ? 0 : "auto", width: mobile ? "100%" : "auto", flex: "none" }}>{right}</div>}
    </header>
  );
}

// Segmented control.
export function Tabs({ value, onChange, options }) {
  return (
    <div className="cip-seg" role="tablist">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} type="button" role="tab" aria-selected={value === o.v}
          className={value === o.v ? "cip-seg-btn is-active" : "cip-seg-btn"}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

// Responsive grid for Stat tiles — 1 column on phones, as many ~220px
// columns as fit above that.
export function StatGrid({ children, style }) {
  return <div className="cip-stat-grid" style={style}>{children}</div>;
}

export function Stat({ label, value, accent, icon }) {
  return (
    <div className="cip-stat cip-in-fast">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {accent && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flex: "none" }} />}
        <div style={{ ...LABEL, color: C.muted, letterSpacing: "0.1em", lineHeight: 1.4, flex: 1, minWidth: 0 }}>{label}</div>
        {icon && <Icon name={icon} size={18} style={{ color: C.faint, flex: "none" }} />}
      </div>
      <div className="cip-num cip-stat-value" style={{ fontFamily: DISPLAY, fontWeight: 500, lineHeight: 1, marginTop: 18, color: C.ink, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

export function Badge({ text, color = C.muted }) {
  return (
    <span className="cip-badge" style={{
      color: `color-mix(in srgb, ${color} 72%, var(--ivory))`,
      background: tint(color, 10), borderColor: tint(color, 30),
    }}>
      {typeof text === "string" ? text.charAt(0).toUpperCase() + text.slice(1) : text}
    </span>
  );
}

// Payment-status pill derived from a due/paid comparison — used across
// Inventory/Customers/Portals so "overdue" always reads the same way.
export function DueBadge({ overdue, dueDate }) {
  if (overdue > 0) return <Badge text={`Overdue ${fmt(overdue)}`} color={C.red} />;
  if (dueDate) return <Badge text={`Next due ${fmtDate(dueDate)}`} color={C.gold} />;
  return <Badge text="Fully scheduled" color={C.green} />;
}

export function ProgressBar({ pct, color }) {
  const ratio = Math.min(100, Math.max(0, pct)) / 100;
  return (
    <div style={{ height: 4, background: C.lineStrong, borderRadius: R.pill, overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", transformOrigin: "left", transform: `scaleX(${ratio})`, background: color || C.gold, borderRadius: R.pill, transition: "transform .6s var(--ease-out)" }} />
    </div>
  );
}

export function Th({ children, right, ...rest }) {
  return <th {...rest} style={{ textAlign: right ? "right" : "left" }}>{children}</th>;
}
export function Td({ children, right, bold, ...rest }) {
  return <td {...rest} style={{ textAlign: right ? "right" : "left", fontWeight: bold ? 600 : 400 }}>{children}</td>;
}

const BTN_KIND = { gold: "gold", ghostLight: "outline", danger: "danger", ghost: "quiet" };

export function Button({ children, onClick, disabled, kind = "gold", size = "md", type = "button" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`cip-btn cip-btn-${BTN_KIND[kind] || "quiet"} cip-btn-${size === "sm" ? "sm" : "md"}`}>
      {children}
    </button>
  );
}

export function ConfirmButton({ children, confirmText, onConfirm, kind = "danger", size = "sm", ...props }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button {...props} kind={kind} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      {open && (
        <Modal title="Please confirm" onClose={() => setOpen(false)} maxWidth={440}>
          <p style={{ margin: "0 0 24px", fontFamily: FONT, fontSize: 15, color: C.ink, lineHeight: 1.6 }}>{confirmText}</p>
          <div className="cip-actions cip-actions-end">
            <Button kind="ghostLight" onClick={() => setOpen(false)}>Cancel</Button>
            <Button kind="danger" onClick={() => { setOpen(false); onConfirm(); }}>Confirm</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

// Permanent-delete gate: the button only arms after the admin types the
// literal word DELETE, matching the "type to confirm" pattern used for any
// truly irreversible action. `label` names what's being destroyed.
export function DangerDeleteButton({ label, onConfirm, size = "sm", ...props }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const armed = typed.trim().toUpperCase() === "DELETE";

  function close() { setOpen(false); setTyped(""); setBusy(false); }

  async function confirm() {
    if (!armed || busy) return;
    setBusy(true);
    await onConfirm();
    close();
  }

  return (
    <>
      <Button {...props} kind="danger" size={size} onClick={() => setOpen(true)}>
        Delete permanently
      </Button>
      {open && (
        <Modal title="Delete permanently" onClose={close} maxWidth={460}>
          <div style={{ background: tint(C.red, 8), border: `1px solid ${tint(C.red, 32)}`, borderRadius: R.md, padding: 16, marginBottom: 20 }}>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: 14.5, color: C.ink, lineHeight: 1.6 }}>
              This will permanently delete <b>{label}</b> from the database. This cannot be undone —
              there is no trash, archive, or recovery for this action.
            </p>
          </div>
          <label className="cip-field">
            <span className="cip-field-label">
              Type <b style={{ color: C.red, fontFamily: MONO, fontWeight: 600 }}>DELETE</b> to confirm
            </span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus placeholder="DELETE"
              className="cip-input" style={{ fontFamily: MONO, letterSpacing: "0.12em", borderColor: armed ? C.red : undefined }} />
          </label>
          <div className="cip-actions cip-actions-end" style={{ marginTop: 8 }}>
            <Button kind="ghostLight" onClick={close}>Cancel</Button>
            <Button kind="danger" onClick={confirm} disabled={!armed || busy}>{busy ? "Deleting…" : "Delete permanently"}</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Field({ label, ...props }) {
  return (
    <label className="cip-field">
      <span className="cip-field-label">{label}</span>
      <input {...props} className="cip-input" />
    </label>
  );
}

export function Select({ label, value, onChange, options, placeholder, compact }) {
  return (
    <label className="cip-field" style={{ marginBottom: compact ? 0 : undefined }}>
      {label && <span className="cip-field-label">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={compact ? "cip-input cip-select cip-input-compact" : "cip-input cip-select"}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

// Rendered via a portal straight onto document.body — every admin/portal
// screen wraps its tab content in a `cip-in`/`cip-in-fast` div, and a
// transformed ancestor (even translateY(0) held by animation-fill-mode)
// becomes the containing block for `position: fixed` descendants. Portaling
// to body keeps the modal centred on the real viewport.
export function Modal({ title, onClose, children, maxWidth = 620 }) {
  const mobile = useIsMobile();
  return createPortal(
    <div onClick={onClose} className="cip-in-fade cip-overlay"
      style={{ alignItems: mobile ? "flex-end" : "center", padding: mobile ? 0 : "32px 20px" }}>
      <div onClick={(e) => e.stopPropagation()} className={mobile ? "cip-modal cip-in-sheet" : "cip-modal cip-in-scale"}
        role="dialog" aria-modal="true"
        style={{
          borderRadius: mobile ? `${R.lg}px ${R.lg}px 0 0` : R.lg, maxWidth: mobile ? "none" : maxWidth,
          maxHeight: mobile ? "92dvh" : "min(90vh, 880px)", margin: mobile ? "auto 0 0" : "auto",
        }}>
        <div className="cip-modal-head" style={{ padding: mobile ? "16px 18px 14px" : "22px 28px 18px" }}>
          {mobile && <span className="cip-sheet-grip" aria-hidden="true" />}
          <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 500, fontSize: mobile ? 24 : 28, lineHeight: 1.15, color: C.ink, minWidth: 0 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" type="button" className="cip-icon-btn" style={{ marginLeft: "auto", flexShrink: 0 }}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div style={{ padding: mobile ? "18px 18px calc(24px + env(safe-area-inset-bottom))" : "24px 28px 28px" }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  const mobile = useIsMobile();
  return (
    <label className="cip-search" style={{ minWidth: mobile ? 0 : 240, width: mobile ? "100%" : undefined }}>
      <Icon name="search" size={18} style={{ color: C.faint }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Search…"} aria-label={placeholder || "Search"} />
    </label>
  );
}

export function RowCard({ children, onClick }) {
  return (
    <div onClick={onClick} className={onClick ? "cip-rowcard cip-in-fast is-clickable" : "cip-rowcard cip-in-fast"}>
      {children}
    </div>
  );
}

export function RowLine({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "5px 0", fontSize: 14 }}>
      <span style={{ color: C.muted, fontFamily: FONT, fontSize: 13, fontWeight: 500, flex: "none" }}>{label}</span>
      <span className="cip-num" style={{ color: C.ink, fontWeight: bold ? 700 : 500, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}

export function KV({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 13.5, color: C.muted, fontFamily: FONT, fontWeight: 500, flex: "none", maxWidth: "45%" }}>{k}</span>
      <span className="cip-num" style={{ fontSize: 14.5, color: C.ink, fontWeight: 500, fontFamily: FONT, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{v}</span>
    </div>
  );
}
