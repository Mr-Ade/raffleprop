'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  LineController, LineElement, PointElement, LinearScale, CategoryScale,
  BarController, BarElement,
  DoughnutController, ArcElement,
  Filler, Tooltip, Legend,
} from 'chart.js';

Chart.register(
  LineController, LineElement, PointElement, LinearScale, CategoryScale,
  BarController, BarElement,
  DoughnutController, ArcElement,
  Filler, Tooltip, Legend,
);

type Period = { labels: string[]; data: number[] };
type CampaignBar = { title: string; sold: number; remaining: number };
type GatewayEntry = { label: string; count: number };

type AdminChartData = {
  revenueTrend: { '7d': Period; '30d': Period; '90d': Period };
  dailyTickets: Period;
  gatewaySplit: GatewayEntry[];
  ticketsPerCampaign: CampaignBar[];
};

function Skeleton({ height }: { height: number }) {
  return (
    <div style={{ height, borderRadius: 8, background: 'var(--bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
  );
}

function RevenueChart({ data }: { data: AdminChartData['revenueTrend'] | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (!data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chartRef.current?.destroy();

    const { labels, data: values } = data[period];
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (₦)',
          data: values,
          borderColor: '#0D5E30',
          backgroundColor: 'rgba(13,94,48,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#0D5E30',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.35,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `₦${Number(ctx.raw).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, maxTicksLimit: 8 } },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { size: 11 },
              callback: (val) => `₦${(Number(val) / 1_000_000).toFixed(1)}M`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, period]);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Revenue Trend</h3>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                padding: '0.2rem 0.625rem',
                fontSize: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                background: period === p ? 'var(--green-primary)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-secondary)',
                fontWeight: period === p ? 700 : 400,
              }}
            >
              {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 220 }}>
        {data ? <canvas ref={canvasRef} /> : <Skeleton height={220} />}
      </div>
    </div>
  );
}

function TicketsPerCampaignChart({ data }: { data: CampaignBar[] | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chartRef.current?.destroy();

    const labels = data.map(d => d.title.length > 20 ? d.title.slice(0, 18) + '…' : d.title);
    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Sold',
            data: data.map(d => d.sold),
            backgroundColor: '#0D5E30',
            borderRadius: 4,
            stack: 'stack',
          },
          {
            label: 'Remaining',
            data: data.map(d => Math.max(0, d.remaining)),
            backgroundColor: 'rgba(13,94,48,0.12)',
            borderRadius: 4,
            stack: 'stack',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { stacked: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Tickets per Campaign</h3>
      <div style={{ height: 220 }}>
        {data ? (
          data.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', paddingTop: '4rem', textAlign: 'center' }}>No campaign data yet.</p>
            : <canvas ref={canvasRef} />
        ) : (
          <Skeleton height={220} />
        )}
      </div>
    </div>
  );
}

function DailyTicketsChart({ data }: { data: Period | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chartRef.current?.destroy();

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Tickets',
          data: data.data,
          backgroundColor: '#C8922A',
          borderRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Sales by Day of Week</h3>
      <div style={{ height: 200 }}>
        {data ? <canvas ref={canvasRef} /> : <Skeleton height={200} />}
      </div>
    </div>
  );
}

function GatewayDonutChart({ data }: { data: GatewayEntry[] | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chartRef.current?.destroy();

    const total = data.reduce((sum, g) => sum + g.count, 0);
    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(g => g.label),
        datasets: [{
          data: data.map(g => g.count),
          backgroundColor: ['#0D5E30', '#C8922A', '#6366f1', '#3b82f6'],
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 12 }, padding: 16, boxWidth: 14 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = total > 0 ? Math.round((Number(ctx.raw) / total) * 100) : 0;
                return ` ${ctx.label}: ${Number(ctx.raw).toLocaleString()} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Payment Gateway Split</h3>
      <div style={{ height: 200 }}>
        {data ? (
          data.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', paddingTop: '3.5rem', textAlign: 'center' }}>No payment data yet.</p>
            : <canvas ref={canvasRef} />
        ) : (
          <Skeleton height={200} />
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardCharts() {
  const [chartData, setChartData] = useState<AdminChartData | null>(null);

  useEffect(() => {
    fetch('/api/admin/chart-data')
      .then(r => r.json())
      .then((j: { success: boolean; data: AdminChartData }) => {
        if (j.success) setChartData(j.data);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="admin-chart-grid-2-1">
        <RevenueChart data={chartData?.revenueTrend ?? null} />
        <TicketsPerCampaignChart data={chartData?.ticketsPerCampaign ?? null} />
      </div>
      <div className="admin-chart-grid-1-1">
        <DailyTicketsChart data={chartData?.dailyTickets ?? null} />
        <GatewayDonutChart data={chartData?.gatewaySplit ?? null} />
      </div>
    </>
  );
}
