'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dashboard } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, Shield } from 'lucide-react';

interface Concern {
  id: string;
  title: string;
  severity: string;
  explanation: string;
  recommended_action: string;
  affected_biomarkers: string[];
}

const severityConfig: Record<string, { color: string; bg: string; border: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { color: 'text-red', bg: 'bg-critical-bg', border: 'border-red/20', icon: AlertCircle, label: 'Critical' },
  high: { color: 'text-amber', bg: 'bg-borderline-bg', border: 'border-amber/20', icon: AlertTriangle, label: 'High Priority' },
  medium: { color: 'text-amber', bg: 'bg-borderline-bg', border: 'border-amber/20', icon: AlertTriangle, label: 'Medium' },
  low: { color: 'text-blue', bg: 'bg-blue/5', border: 'border-blue/20', icon: Info, label: 'Low Priority' },
};

export default function ConcernsPage() {
  const { getToken } = useAuth();
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadConcerns();
  }, []);

  const loadConcerns = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await dashboard.getConcerns(token);
      if (res?.data) {
        setConcerns(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  // Group by severity
  const grouped = concerns.reduce<Record<string, Concern[]>>((acc, c) => {
    const sev = c.severity || 'low';
    if (!acc[sev]) acc[sev] = [];
    acc[sev].push(c);
    return acc;
  }, {});

  const severityOrder = ['critical', 'high', 'medium', 'low'];

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-midnight mb-1">
        Health Concerns
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Areas that need your attention based on your latest report
      </p>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface rounded-xl" />
          ))}
        </div>
      ) : concerns.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-7 h-7 text-green" />}
          title="No concerns found"
          description="Your biomarkers look good! Upload a report to get a health assessment."
        />
      ) : (
        <div className="space-y-6">
          {severityOrder.map(sev => {
            const items = grouped[sev];
            if (!items || items.length === 0) return null;
            const config = severityConfig[sev] || severityConfig.low;
            const Icon = config.icon;

            return (
              <div key={sev}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <h2 className="text-sm font-semibold text-text-primary">{config.label}</h2>
                  <span className="text-xs text-text-muted">({items.length})</span>
                </div>

                <div className="space-y-2">
                  {items.map(concern => {
                    const isExpanded = expanded === concern.id;
                    return (
                      <Card
                        key={concern.id}
                        padding="sm"
                        className={`cursor-pointer border ${config.border}`}
                        onClick={() => setExpanded(isExpanded ? null : concern.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">{concern.title}</p>
                            {!isExpanded && (
                              <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                                {concern.explanation}
                              </p>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                          )}
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border-light space-y-3 animate-fadeUp">
                            <p className="text-sm text-text-secondary leading-relaxed">
                              {concern.explanation}
                            </p>
                            {concern.recommended_action && (
                              <div className="p-3 bg-optimal-bg rounded-lg">
                                <p className="text-xs font-medium text-green mb-1">Recommended Action</p>
                                <p className="text-xs text-text-secondary">{concern.recommended_action}</p>
                              </div>
                            )}
                            {concern.affected_biomarkers && concern.affected_biomarkers.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {concern.affected_biomarkers.map((b: string, i: number) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-surface rounded-full text-text-muted">
                                    {b}
                                  </span>
                                ))}
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
      )}
    </AppShell>
  );
}
