'use client';

export default function AdminRefreshButton() {
  return (
    <button
      type="button"
      onClick={() => location.reload()}
      className="btn btn-outline btn-sm"
    >
      <i className="fa-solid fa-rotate" style={{ marginRight: '0.375rem' }} />Refresh
    </button>
  );
}
