import React from 'react';
import { CheckCircleIcon, XCircleIcon, LoadingSpinner } from '../Icons';

const JobStatus = ({ title, status, error, warning, logContent }) => {
    let statusInfo = {
        color: 'blue',
        textColor: 'text-blue-300',
        bgColor: 'bg-blue-900/30',
        borderColor: 'border-blue-500',
        iconColor: 'text-blue-400',
        icon: <LoadingSpinner />
    };

    if (status === 'completed') {
        statusInfo = { ...statusInfo, color: 'green', textColor: 'text-green-300', bgColor: 'bg-green-900/30', borderColor: 'border-green-500', iconColor: 'text-green-400', icon: <CheckCircleIcon /> };
    } else if (status === 'failed') {
        statusInfo = { ...statusInfo, color: 'red', textColor: 'text-red-300', bgColor: 'bg-red-900/30', borderColor: 'border-red-500', iconColor: 'text-red-400', icon: <XCircleIcon /> };
    }
    
    if (warning) {
        statusInfo.color = 'yellow';
        statusInfo.textColor = 'text-yellow-300';
        statusInfo.bgColor = 'bg-yellow-900/30';
        statusInfo.borderColor = 'border-yellow-500';
        statusInfo.iconColor = 'text-yellow-400';
    }

    return (
        <div className={`${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg p-4 mb-6 animate-fade-in`}>
            <div className="flex items-center">
                <div className={`mr-4 ${statusInfo.iconColor}`}>{statusInfo.icon}</div>
                <div className="w-full">
                    <p className={`font-semibold text-lg ${statusInfo.textColor}`}>{title}</p>
                    {logContent && <pre className="text-gray-400 text-xs mt-2 bg-gray-900/50 p-2 rounded whitespace-pre-wrap max-h-48 overflow-y-auto">{logContent}</pre>}
                    {warning && <p className="text-yellow-400 text-sm mt-2">{warning}</p>}
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};


export default JobStatus;