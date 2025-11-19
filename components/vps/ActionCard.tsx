import React from 'react';
import { LoadingSpinner, CubeIcon } from '../Icons';

const ActionCard = ({ title, onClick, loading = false }) => (
    <div 
      className={`bg-gray-800 border border-gray-700 rounded-lg p-6 text-center transition-colors ${!loading ? 'cursor-pointer hover:bg-gray-700 hover:border-blue-500' : 'opacity-50 cursor-not-allowed'}`}
      onClick={!loading ? onClick : undefined}
    >
      <div className="flex flex-col items-center justify-center h-full">
        {loading ? <LoadingSpinner /> : <CubeIcon className="w-10 h-10 text-blue-400 mb-4" />}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
    </div>
);

export default ActionCard;