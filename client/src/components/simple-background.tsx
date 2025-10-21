import React from 'react';

interface SimpleBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

// Dark background wrapper - NOT fixed, so it scrolls naturally with content
export const SimpleBackground: React.FC<SimpleBackgroundProps> = ({ className = '', children }) => {
  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Dark base layer that scrolls with content */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -z-20" />
      {children}
    </div>
  );
};

export default SimpleBackground;
