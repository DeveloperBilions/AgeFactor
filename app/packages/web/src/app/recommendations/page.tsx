'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dashboard } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import {
  UtensilsCrossed,
  Pill,
  HeartPulse,
  FlaskConical,
  Lightbulb,
  Star,
} from 'lucide-react';

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: number;
}

const typeConfig: Record<string, { icon: typeof Pill; color: string; bg: string; label: string }> = {
  diet: { icon: UtensilsCrossed, color: 'text-green', bg: 'bg-optimal-bg', label: 'Diet' },
  supplement: { icon: Pill, color: 'text-terracotta', bg: 'bg-terracotta/5', label: 'Supplements' },
  lifestyle: { icon: HeartPulse, color: 'text-blue', bg: 'bg-blue/5', label: 'Lifestyle' },
  retest: { icon: FlaskConical, color: 'text-amber', bg: 'bg-borderline-bg', label: 'Follow-up Tests' },
};

const priorityStars = (priority: number) => {
  return Array.from({ length: Math.min(priority, 5) }, (_, i) => (
    <Star
      key={i}
      className="w-3 h-3 text-amber fill-amber"
    />
  ));
};

export default function RecommendationsPage() {
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<Record<string, Recommendation[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await dashboard.getRecommendations(token);
      if (res?.data) {
        // API might return grouped or flat data
        if (Array.isArray(res.data)) {
          const grouped: Record<string, Recommendation[]> = {};
          res.data.forEach((r: Recommendation) => {
            const type = r.type || 'lifestyle';
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(r);
          });
          setGroups(grouped);
        } else {
          setGroups(res.data as Record<string, Recommendation[]>);
        }
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const typeOrder = ['diet', 'supplement', 'lifestyle', 'retest'];
  const allTypes = typeOrder.filter(t => groups[t] && groups[t].length > 0);
  const totalCount = Object.values(groups).flat().length;

  const displayTypes = activeTab ? [activeTab] : allTypes;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-midnight mb-1">
        Recommendations
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Personalized actions to improve your health markers
      </p>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-surface rounded-xl" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <EmptyState
          icon={<Lightbulb className="w-7 h-7 text-amber" />}
          title="No recommendations yet"
          description="Upload a blood report to get personalized health recommendations."
        />
      ) : (
        <>
          {/* Tabs */}
          {allTypes.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab(null)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !activeTab
                    ? 'bg-terracotta text-white'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                All ({totalCount})
              </button>
              {allTypes.map(type => {
                const config = typeConfig[type] || typeConfig.lifestyle;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveTab(activeTab === type ? null : type)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === type
                        ? 'bg-terracotta text-white'
                        : 'bg-surface text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {config.label} ({groups[type]?.length || 0})
                  </button>
                );
              })}
            </div>
          )}

          {/* Recommendation groups */}
          <div className="space-y-6">
            {displayTypes.map(type => {
              const items = groups[type];
              if (!items || items.length === 0) return null;
              const config = typeConfig[type] || typeConfig.lifestyle;
              const Icon = config.icon;

              return (
                <div key={type}>
                  {!activeTab && (
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <h2 className="text-sm font-semibold text-text-primary">{config.label}</h2>
                    </div>
                  )}

                  <div className="space-y-2">
                    {items
                      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                      .map(rec => {
                        const RecIcon = config.icon;
                        return (
                          <Card key={rec.id} padding="sm">
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                                <RecIcon className={`w-4 h-4 ${config.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-sm font-medium text-text-primary">{rec.title}</p>
                                  {rec.priority >= 4 && (
                                    <div className="flex">
                                      {priorityStars(rec.priority)}
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                  {rec.description}
                                </p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}
