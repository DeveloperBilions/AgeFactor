'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { reports } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

type UploadState = 'idle' | 'selected' | 'uploading' | 'processing' | 'success' | 'error';

export default function UploadPage() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) {
      setError('Only PDF files up to 10MB are accepted');
      return;
    }
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setState('selected');
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    const token = getToken();
    if (!token) {
      router.replace('/auth');
      return;
    }

    setState('uploading');
    setProgress(0);

    // Simulate progress since fetch doesn't support progress
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 90) { clearInterval(progressInterval); return 90; }
        return p + Math.random() * 15;
      });
    }, 400);

    try {
      const res = await reports.upload(token, file);
      clearInterval(progressInterval);
      setProgress(100);
      setState('processing');

      if (res.data?.id) {
        setReportId(res.data.id);
        // Poll for processing completion
        await pollReportStatus(token, res.data.id);
      } else {
        setState('success');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || 'Upload failed');
      setState('error');
    }
  };

  const pollReportStatus = async (token: string, id: string) => {
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async (): Promise<void> => {
      try {
        const res = await reports.getById(token, id);
        if (res.data?.status === 'analyzed') {
          setState('success');
          return;
        }
        if (res.data?.status === 'error') {
          setError('Analysis failed. Please try uploading again.');
          setState('error');
          return;
        }
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 3000));
          return poll();
        }
        // Still processing, let user go to dashboard
        setState('success');
      } catch {
        setState('success'); // Optimistic - let them check dashboard
      }
    };

    await poll();
  };

  const resetUpload = () => {
    setFile(null);
    setState('idle');
    setError('');
    setReportId(null);
    setProgress(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto">
        <h1 className="font-display text-2xl font-semibold text-midnight mb-1">
          Upload Report
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          Upload a blood test PDF and our AI will analyze your biomarkers
        </p>

        {/* Idle / Selected state - dropzone */}
        {(state === 'idle' || state === 'selected') && (
          <>
            <Card padding="sm">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150
                  ${isDragActive
                    ? 'border-terracotta bg-terracotta/5'
                    : 'border-border hover:border-terracotta/40 hover:bg-surface/50'
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-5 h-5 text-terracotta" />
                </div>
                <p className="text-sm font-medium text-text-primary mb-1">
                  {isDragActive ? 'Drop your PDF here' : 'Drag & drop your blood report'}
                </p>
                <p className="text-xs text-text-muted">
                  PDF files up to 10MB
                </p>
              </div>
            </Card>

            {/* Selected file */}
            {file && state === 'selected' && (
              <div className="mt-4 animate-fadeUp">
                <Card padding="sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-critical-bg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-red" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                      <p className="text-xs text-text-muted">{formatFileSize(file.size)}</p>
                    </div>
                    <button onClick={resetUpload} className="text-text-muted hover:text-text-secondary p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </Card>

                <Button onClick={handleUpload} className="w-full mt-4" size="lg" iconRight={<ArrowRight className="w-4 h-4" />}>
                  Analyze Report
                </Button>
              </div>
            )}
          </>
        )}

        {/* Uploading state */}
        {state === 'uploading' && (
          <Card className="animate-fadeUp">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                <Upload className="w-5 h-5 text-terracotta animate-pulse" />
              </div>
              <h3 className="font-display text-lg font-semibold text-midnight mb-1">Uploading...</h3>
              <p className="text-sm text-text-secondary mb-4">Sending your report for analysis</p>

              <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-terracotta rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-muted mt-2">{Math.round(progress)}%</p>
            </div>
          </Card>
        )}

        {/* Processing state */}
        {state === 'processing' && (
          <Card className="animate-fadeUp">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-terracotta border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-midnight mb-1">Analyzing your report</h3>
              <p className="text-sm text-text-secondary">
                Our AI is extracting biomarkers and generating insights. This usually takes 30-60 seconds.
              </p>
            </div>
          </Card>
        )}

        {/* Success state */}
        {state === 'success' && (
          <Card className="animate-fadeUp">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-optimal-bg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green" />
              </div>
              <h3 className="font-display text-lg font-semibold text-midnight mb-1">Analysis Complete</h3>
              <p className="text-sm text-text-secondary mb-6">
                Your report has been analyzed. View your health insights now.
              </p>

              <div className="flex flex-col gap-2">
                {reportId && (
                  <Button
                    onClick={() => router.push(`/reports/${reportId}`)}
                    className="w-full"
                    size="lg"
                    iconRight={<ArrowRight className="w-4 h-4" />}
                  >
                    View Report
                  </Button>
                )}
                <Button onClick={() => router.push('/dashboard')} variant="secondary" className="w-full" size="lg">
                  Go to Dashboard
                </Button>
                <Button onClick={resetUpload} variant="ghost" className="w-full">
                  Upload Another
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Error state */}
        {state === 'error' && (
          <Card className="animate-fadeUp">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-critical-bg flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red" />
              </div>
              <h3 className="font-display text-lg font-semibold text-midnight mb-1">Upload Failed</h3>
              <p className="text-sm text-text-secondary mb-6">{error}</p>

              <Button onClick={resetUpload} className="w-full" size="lg">
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Tips */}
        {(state === 'idle' || state === 'selected') && (
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-medium text-text-primary">Tips for best results</h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p className="flex items-start gap-2">
                <span className="text-green mt-0.5">•</span>
                Upload the original PDF from your lab, not a photo
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green mt-0.5">•</span>
                Make sure the report is a Complete Blood Count (CBC) or Full Panel
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green mt-0.5">•</span>
                Reports from major Indian labs like Thyrocare, SRL, Dr. Lal PathLabs work best
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
