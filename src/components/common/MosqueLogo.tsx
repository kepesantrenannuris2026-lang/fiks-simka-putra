import React from 'react';

interface MosqueLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only' | 'badge';
  withText?: boolean;
}

export const MosqueLogo: React.FC<MosqueLogoProps> = ({
  className = '',
  size = 'md',
  withText = false
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/logo-simka.png"
        alt="Logo Masjid SIMKA.ID"
        className={`${iconSize} object-contain shrink-0 rounded-xl`}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/logo-simka.svg';
        }}
      />

      {withText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              SIMKA<span className="text-emerald-600 dark:text-emerald-400">.ID</span>
            </span>
          </div>
          <span className="text-[10.5px] font-medium text-slate-500 dark:text-emerald-200/80 tracking-normal mt-0.5">
            Sistem Monitoring Karakter
          </span>
        </div>
      )}
    </div>
  );
};
