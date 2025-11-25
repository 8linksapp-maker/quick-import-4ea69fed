import React from 'react';

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  value?: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  colorClass?: string; // e.g., 'text-green-400', 'text-red-400'
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon,
  title,
  value,
  description,
  onClick,
  disabled = false,
  colorClass = 'text-blue-400',
}) => {
  const cardClasses = `
    bg-gradient-to-br from-gray-800 to-gray-800/80 backdrop-blur-sm
    border border-white/10
    rounded-lg p-6 flex flex-col justify-between
    transition-all duration-300 transform
    ${!disabled ? `cursor-pointer 
                   hover:border-blue-400/50
                   hover:shadow-2xl hover:shadow-blue-500/20
                   hover:-translate-y-1` 
               : 'opacity-60 cursor-not-allowed'}
  `;

  return (
    <div className={cardClasses} onClick={!disabled ? onClick : undefined}>
      <div>
        <div className="flex justify-between items-start mb-4">
          {/* Icon top-left */}
          <div className={`w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center`}>
            <div className={colorClass}>
              {icon}
            </div>
          </div>
          {/* Value top-right (only if it exists) */}
          {value && (
              <h3 className="text-4xl font-bold text-white">{value}</h3>
          )}
        </div>
        {/* Title and Description below */}
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
};

export default DashboardCard;
