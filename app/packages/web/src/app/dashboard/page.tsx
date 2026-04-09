'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dashboard, reports as reportsApi } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Card from '@/components/ui/Card';
import ScoreRing from '@/components/ui/ScoreRing';
import StatusPill from '@/components/ui/StatusPill';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { ORGAN_SYSTEMS, COLORS } from '@/lib/constants';
import {
  Upload,
  FileText,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Activity,
} from 'lucide-react';

interface DashboardData {
  latestReport: any;
  organScores: any[];
  biomarkerCounts: { optimal: number; borderline: number; outOfRange: number };
  totalReports: number;
}

export default function DashboardPage() {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const [summaryRes, reportsRes] = await Promise.all([
        dashboard.getSummary(token).catch(() => null),
        reportsApi.list(token, 1, 5).catch(() => null),
      ]);

      if (summaryRes?.data) {
        setData(summaryRes.data);
      }
      if (reportsRes?.data) {
        setRecentReports(reportsRes.data);
      }
    } catch {
      // Gracefully handle errors
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <AppShell>
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-surface rounded-lg w-48" />
          <div className="h-4 bg-surface rounded w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-surface rounded-xl" />
            ))}
          </div>
        </div>
      ) : !data?.latestReport ? (
        /* Empty state - no reports yet */
        <div className="mt-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-semibold text-midnight">
              {greeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-text-secondary mt-1">
              Upload your first blood report to get started
            </p>
          </div>
          <EmptyState
            icon={<FileText className="w-7 h-7 text-text-muted" />}
            title="No reports yet"
            description="Upload a blood test PDF and our AI will analyze your biomarkers with functional optimal ranges."
            action={
              <Button onClick={() => router.push('/upload')} icon={<Upload className="w-4 h-4" />}>
                Upload Your First Report
              </Button>
            }
          />
        </div>
      ) : (
        /* Dashboard with data */
        <div className="animate-stagger">
          {/* Greeting */}
          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold text-midnight">
              {greeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Here&apos;s your latest health overview
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card padding="sm" className="text-center">
              <p className="text-2xl font-semibold text-green">{data.biomarkerCounts?.optimal || 0}</p>
              <p className="text-xs text-text-secondary mt-0.5">Optimal</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-2xl font-semibold text-amber">{data.biomarkerCounts?.borderline || 0}</p>
              <p className="text-xs text-text-secondary mt-0.5">Borderline</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-2xl font-semibold text-red">{data.biomarkerCounts?.outOfRange || 0}</p>
              <p className="text-xs text-text-secondary mt-0.5">Out of Range</p>
            </Card>
          </div>

          {/* Organ System Scores */}
          {data.organScores && data.organScores.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-semibold text-midnight">
                  Organ Systems
                </h2>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {data.organScores.length} systems
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.organScores.map((os: any) => {
                  const config = ORGAN_SYSTEMS[os.system as keyof typeof ORGAN_SYSTEMS];
                  if (!config) return null;
                  return (
                    <Card
                      key={os.system}
                      padding="sm"
                      hover
                      className="cursor-pointer"
                      onClick={() => router.push(`/reports/${data.latestReport.id}?system=${os.system}`)}
                    >
                      <div className="flex flex-col items-center gap-2 py-1">
                        <ScoreRing
                          score={Math.round(os.score)}
                          size={64}
                          strokeWidth={5}
                          color={config.color}
                        />
                        <div className="text-center">
                          <p className="text-sm font-medium text-text-primary">{config.name}</p>
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{os.summary}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick actions row */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card
              hover
              padding="sm"
              className="cursor-pointer"
              onClick={() => router.push('/concerns')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-borderline-bg flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Concerns</p>
                  <p className="text-xs text-text-muted">View health flags</p>
                </div>
              </div>
            </Card>

            <Card
              hover
              padding="sm"
              className="cursor-pointer"
              onClick={() => router.push('/recommendations')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-optimal-bg flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-green" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Actions</p>
                  <p className="text-xs text-text-muted">Recommendations</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Reports */}
          {recentReports.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-semibold text-midnight">
                  Recent Reports
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/upload')}
                  icon={<Upload className="w-3.5 h-3.5" />}
                >
                  Upload New
                </Button>
              </div>

              <div className="space-y-2">
                {recentReports.map((report: any) => (
                  <Card
                    key={report.id}
                    padding="sm"
                    hover
                    className="cursor-pointer"
                    onClick={() => router.push(`/reports/${report.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {report.lab_name || report.labName || 'Blood Report'}
                        </p>
                        <p className="text-xs text-text-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.report_date || report.reportDate || report.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <StatusPill status={report.status === 'analyzed' ? 'optimal' : report.status === 'processing' ? 'borderline' : 'critical'} />
                      <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
