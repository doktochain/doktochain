import React from 'react';

interface LoadingSkeletonProps {
  type?: 'text' | 'card' | 'table' | 'form';
  rows?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'text',
  rows = 3,
  className = ''
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  if (type === 'text') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${baseClasses} h-4`} style={{ width: `${100 - i * 10}%` }} />
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`${baseClasses} p-6 space-y-4 ${className}`}>
        <div className={`${baseClasses} h-6 w-3/4`} />
        <div className={`${baseClasses} h-4 w-full`} />
        <div className={`${baseClasses} h-4 w-5/6`} />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className={`${baseClasses} h-10 w-full`} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${baseClasses} h-16 w-full`} />
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className={`${baseClasses} h-4 w-24`} />
            <div className={`${baseClasses} h-10 w-full`} />
          </div>
        ))}
      </div>
    );
  }

  return null;
};
