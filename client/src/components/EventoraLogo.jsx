import React from 'react';

export default function EventoraLogo({ size = 'md', className = '' }) {
  const textClasses = {
    sm: 'text-xl font-bold tracking-tight',
    md: 'text-2xl font-extrabold tracking-tight',
    lg: 'text-3xl font-black tracking-tight',
    xl: 'text-4xl font-black tracking-tight'
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <span className={`${textClasses[size]} text-[#635BFF] dark:text-[#817AFE] tracking-tight leading-none select-none`}>
        Eventora
      </span>
    </div>
  );
}

