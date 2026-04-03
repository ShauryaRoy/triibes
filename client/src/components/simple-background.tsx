import React from 'react';

interface SimpleBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

// Theme-aware background wrapper that scrolls naturally with content
export const SimpleBackground: React.FC<SimpleBackgroundProps> = ({ className = '', children }) => {
  return (
    <div className={`relative min-h-screen bg-background transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
};

export default SimpleBackground;
