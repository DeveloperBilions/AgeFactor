'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { reports as reportsApi } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Card from '@/components/ui/Card';
import ScoreRing from '@/components/ui/ScoreRing';
import StatusPill from '@/components/ui/StatusPill';
import Button from '@/components/ui/Button';
import { ORGAN_SYSTEMS, BiomarkerStatus } from '@/lib/constants';
import {
  ArrowLeft,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface BiomarkerData {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: BiomarkerStatus;
  category: string;
  lab_range_low: number;
  lab_range_high: number;
  optimal_range_low: number;
  optimal_range_high: number;
  ai_explanation: string;
}

interface ReportData {
  id: string;
  lab_name: string;
  report_date: string;
  status: string;
  created_at: string;
  organ_system_scores?: any[];
  biomarkers?: Record<string, BiomarkerData[]>;
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const router = useRouter();

  const [report, setReport] = useState<ReportData | null>(null);
  const [biomarkerGroups, setBiomarkerGroups] = useState<Record<string, BiomarkerData[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeSystem, setActiveSystem] = useState<string | null>(searchParams.get('system'));
  const [expandedBiomarker, setExpandedBiomarker] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    const token = getToken();
    if (!token || !id) return;

    try {
      const [reportRes, biomarkersRes] = await Promise.all([
        reportsApi.getById(token, id as string),
        reportsApi.getBiomarkers(token, id as string),
      ]);

      if (reportRes?.data) setReport(reportRes.data);
      if (biomarkersRes?.data) {
        // Group biomarkers by category
        const grouped: Record<string, BiomarkerData[]> = {};
        const markers = Array.isArray(biomarkersRes.data) ? biomarkersRes.data : biomarkersRes.data.biomarkers || [];
        markers.forEach((b: BiomarkerData) => {
          const cat = b.category || 'other';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(b);
        });
        setBiomarkerGroups(grouped);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const getBarPosition = (value: number, low: number, high: number) => {
    const range = high - low;
    const buffer = range * 0.3;
    const min = low - buffer;
    const max = high + buffer;
    const pos = ((value - min) / (max - min)) * 100;
    return Math.max(2, Math.min(98, pos));
  };

  const filteredSystems = activeSystem
    ? Object.entries(biomarkerGroups).filter(([key]) => key === activeSystem)
    : Object.entries(biomarkerGroups);

  return (
    <AppShell>
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 bg-surface rounded w-32" />
          <div className="h-40 bg-surface rounded-xl" />
          <div className="h-32 bg-surface rounded-xl" />
        </div>
      ) : !report ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">Report not found</p>
          <Button onClick={() => router.push('/dashboard')} variant="secondary" className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      ) : (
        <div>
          {/* Header */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-midnight">
                {report.lab_name || 'Blood Report'}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                {report.report_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(report.report_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {report.lab_name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {report.lab_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Organ scores summary */}
          {report.organ_system_scores && report.organ_system_scores.length > 0 && (
            <Card className="mb-6">
              <h2 className="font-display text-base font-semibold text-midnight mb-4">
                System Scores
              </h2>
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                {report.organ_system_scores.map((os: any) => {
                  const config = ORGAN_SYSTEMS[os.system as keyof typeof ORGAN_SYSTEMS];
                  return (
                    <button
                      key={os.system}
                      onClick={() => setActiveSystem(activeSystem === os.system ? null : os.system)}
                      className={`transition-all duration-150 rounded-xl p-2 ${
                        activeSystem === os.system
                          ? 'bg-surface ring-1 ring-terracotta/30'
                          : 'hover:bg-surface/50'
                      }`}
                    >
                      <ScoreRing
                        score={Math.round(os.score)}
                        size={56}
                        strokeWidth={4}
                        color={config?.color}
                        label={config?.name || os.system}
                      />
                    </button>
                  );
                })}
              </div>
              {activeSystem && (
                <button
                  onClick={() => setActiveSystem(null)}
                  className="text-xs text-terracotta font-medium mt-3 hover:underline"
                >
                  Show all biomarkers
                </button>
              )}
            </Card>
          )}

          {/* Biomarker groups */}
          <div className="space-y-6">
            {filteredSystems.map(([system, markers]) => {
              const config = ORGAN_SYSTEMS[system as keyof typeof ORGAN_SYSTEMS];
              return (
                <div key={system}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config?.color || '#9A9BA1' }}
                    />
                    <h3 className="font-display text-base font-semibold text-midnight">
                      {config?.label || system}
                    </h3>
                    <span className="text-xs text-text-muted">
                      {markers.length} markers
                    </span>
                  </div>

                  <div className="space-y-2">
                    {markers.map((marker) => {
                      const isExpanded = expandedBiomarker === marker.id;
                      return (
                        <Card
                          key={marker.id}
                          padding="sm"
                          className="cursor-pointer"
                          onClick={() => setExpandedBiomarker(isExpanded ? null : marker.id)}
                        >
                          {/* Main row */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-text-primary">
                                  {marker.name}
                                </p>
                                <StatusPill status={marker.status} />
                              </div>
                              <p className="text-xs text-text-muted mt-0.5">
                                {marker.value} {marker.unit}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                            )}
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-border-light animate-fadeUp">
                              {/* Range bar */}
                              <div className="mb-4">
                                <div className="flex justify-between text-xs text-text-muted mb-1.5">
                                  <span>Lab range: {marker.lab_range_low} – {marker.lab_range_high}</span>
                                  <span>Optimal: {marker.optimal_range_low} – {marker.optimal_range_high}</span>
                                </div>
                                <div className="relative h-3 bg-surface rounded-full overflow-hidden">
                                  {/* Optimal zone */}
                                  <div
                                    className="absolute top-0 h-full bg-optimal/20 rounded-full"
                                    style={{
                                      left: `${getBarPosition(marker.optimal_range_low, marker.lab_range_low, marker.lab_range_high)}%`,
                                      width: `${getBarPosition(marker.optimal_range_high, marker.lab_range_low, marker.lab_range_high) - getBarPosition(marker.optimal_range_low, marker.lab_range_low, marker.lab_range_high)}%`,
                                    }}
                                  />
                                  {/* Value marker */}
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white"
                                    style={{
                                      left: `${getBarPosition(marker.value, marker.lab_range_low, marker.lab_range_high)}%`,
                                      transform: 'translate(-50%, -50%)',
                                      backgroundColor:
                                        marker.status === 'optimal'
                                          ? '#79BD8B'
                                          : marker.status === 'borderline'
                                          ? '#E8A838'
                                          : '#D95550',
                                    }}
                                  />
                                </div>
                              </div>

                              {/* AI Explanation */}
                              {marker.ai_explanation && (
                                <div className="flex gap-2 p-3 bg-surface rounded-lg">
                                  <Info className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                                  <p className="text-xs text-text-secondary leading-relaxed">
                                    {marker.ai_explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty biomarkers state */}
          {Object.keys(biomarkerGroups).length === 0 && (
            <Card className="text-center py-8">
              <p className="text-sm text-text-secondary">
                {report.status === 'processing'
                  ? 'This report is still being analyzed...'
                  : 'No biomarkers found in this report.'}
              </p>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
