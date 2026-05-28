import React from 'react';
import * as LucideImport from 'lucide-react';

interface LucideIconProps {
  name: string;
  className?: string;
  size?: number | string;
}

export const LucideIcon: React.FC<LucideIconProps> = ({ name, className = '', size = 18 }) => {
  // Graceful fallback for icons not found in standard Lucide registry
  const IconComponent = (LucideImport as any)[name] || LucideImport.MapPin;
  return <IconComponent className={className} size={size} />;
};
export default LucideIcon;
