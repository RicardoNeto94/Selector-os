"use client";

export default function SpaConfirmDialog({ open, title, description, confirmLabel = "Delete", onCancel, onConfirm, busy = false }) {
  if (!open) return null;

  return (
    <div className="spa-confirm-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel?.()}>
      <section className="spa-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="spa-confirm-title">
        <div className="spa-confirm-mark">!</div>
        <span>Confirmation required</span>
        <h2 id="spa-confirm-title">{title}</h2>
        <p>{description}</p>
        <div>
          <button type="button" className="spa-button-secondary" onClick={onCancel} disabled={busy}>Keep it</button>
          <button type="button" className="spa-button-danger" onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
