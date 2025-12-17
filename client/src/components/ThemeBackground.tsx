import React from 'react';
import { AuroraBackground } from './AuroraBackground';
import { FirefliesBackground } from './FirefliesBackground';
import { MatrixBackground } from './MatrixBackground';
import { WarpSpeedBackground } from './WarpSpeedBackground';
import { FireStormBackground } from './FireStormBackground';

interface ThemeBackgroundProps {
  themeId?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ 
  themeId = 'matrix-code', 
  className = '', 
  children 
}) => {
  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Base dark background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -z-20" />
      
      {/* Theme-specific animated background - only render if not 'none' */}
      {themeId === 'matrix-code' && <MatrixBackground />}
      {themeId === 'warp-speed' && <WarpSpeedBackground />}
      {themeId === 'aurora' && <AuroraBackground />}
      {themeId === 'fireflies' && <FirefliesBackground />}
      {themeId === 'fire-storm' && <FireStormBackground />}
      {/* 'none' theme will just show the base dark background */}
      
      {/* Content */}
      {children}
    </div>
  );
};

export default ThemeBackground;
