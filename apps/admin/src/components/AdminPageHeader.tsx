interface Props {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function AdminPageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="admin-topbar">
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
