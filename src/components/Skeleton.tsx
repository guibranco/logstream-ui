import React from 'react';

export const Skeleton: React.FC = () => {
  return (
    <div className="animate-pulse border-b border-gray-900">
      <div className="flex items-center px-4 h-12 gap-4">
        <div className="w-32 h-3 bg-gray-800 rounded" />
        <div className="w-24 h-5 bg-gray-800 rounded" />
        <div className="w-32 h-3 bg-gray-800 rounded" />
        <div className="w-24 h-3 bg-gray-800 rounded" />
        <div className="w-32 h-3 bg-gray-800 rounded" />
        <div className="flex-1 h-4 bg-gray-800 rounded" />
        <div className="w-32 h-3 bg-gray-800 rounded" />
        <div className="w-10 h-4 bg-gray-800 rounded" />
      </div>
    </div>
  );
};
