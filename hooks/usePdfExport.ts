import { useState, useCallback, useRef, useEffect } from 'react';
import {
  submitAsyncPDFJob,
  getJobStatus,
  downloadJobResult,
  cancelJob,
  ResumeDataForAPI,
  JobStatusResponse,
} from '../utils/api-client';

export type ExportStatus = 'idle' | 'submitting' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface UsePdfExportResult {
  status: ExportStatus;
  progress: number;
  error: string | null;
  jobId: string | null;
  eta: number | null;
  startExport: (resumeData: ResumeDataForAPI, variant?: string) => Promise<void>;
  cancelExport: () => Promise<void>;
  reset: () => void;
}

const POLLING_INTERVAL = 1000;

/**
 * Hook for managing async PDF export with progress tracking
 */
export function usePdfExport(): UsePdfExportResult {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [eta, setEta] = useState<number | null>(null);

  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (id: string) => {
      try {
        const job = await getJobStatus(id);

        setProgress(job.progress);
        setEta(job.eta_seconds);

        if (job.state === 'completed') {
          setStatus('completed');
          clearPolling();

          // Automatically trigger download
          const blob = await downloadJobResult(id);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `resume-${id.substring(0, 8)}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else if (job.state === 'failed') {
          setStatus('failed');
          setError(job.error || 'Rendering failed');
          clearPolling();
        } else if (job.state === 'cancelled') {
          setStatus('cancelled');
          clearPolling();
        } else {
          // Still processing or pending
          setStatus(job.state === 'processing' ? 'processing' : 'submitting');
          pollingTimerRef.current = setTimeout(() => pollStatus(id), POLLING_INTERVAL);
        }
      } catch (err) {
        console.error('Polling failed:', err);
        setStatus('failed');
        setError('Connection lost while tracking progress');
        clearPolling();
      }
    },
    [clearPolling],
  );

  const startExport = useCallback(
    async (resumeData: ResumeDataForAPI, variant: string = 'modern') => {
      setStatus('submitting');
      setProgress(0);
      setError(null);
      setEta(null);

      try {
        const { job_id } = await submitAsyncPDFJob(resumeData, variant, 'high');
        setJobId(job_id);
        pollStatus(job_id);
      } catch (err) {
        console.error('Export failed to start:', err);
        setStatus('failed');
        setError(err instanceof Error ? err.message : 'Failed to start export');
      }
    },
    [pollStatus],
  );

  const handleCancelExport = useCallback(async () => {
    if (!jobId || (status !== 'submitting' && status !== 'processing')) return;

    try {
      await cancelJob(jobId);
      setStatus('cancelled');
      clearPolling();
    } catch (err) {
      console.error('Cancellation failed:', err);
      // Even if API fails, stop polling and show as cancelled locally
      setStatus('cancelled');
      clearPolling();
    }
  }, [jobId, status, clearPolling]);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setJobId(null);
    setEta(null);
    clearPolling();
  }, [clearPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  return {
    status,
    progress,
    error,
    jobId,
    eta,
    startExport,
    cancelExport: handleCancelExport,
    reset,
  };
}
