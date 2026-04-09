import { BiomarkerStatus, STATUS_LABELS } from '@/lib/constants';

interface StatusPillProps {
  status: BiomarkerStatus;
  className?: string;
}

export default function StatusPill({ status, className = '' }: StatusPillProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        status-${status}
        ${className}
      `}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
