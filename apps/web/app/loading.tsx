export default function Loading() {
  return (
    <main className="shell" aria-busy="true" aria-label="Loading PowerPay">
      <div className="loading-header">
        <div className="loading-brand" />
        <div className="loading-action" />
      </div>
      <div className="loading-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card skeleton-side" />
      </div>
    </main>
  );
}
