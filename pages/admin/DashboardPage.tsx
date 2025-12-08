import React from 'react';
import useDocumentTitle from '../../src/hooks/useDocumentTitle';

const DashboardPage: React.FC = () => {
    useDocumentTitle('Admin: Visão Geral');
    const stats = [
        { title: 'Total Users', value: '1,234' },
        { title: 'Total Courses', value: '56' },
        { title: 'Total APIs', value: '5' },
        { title: 'API Costs', value: '$1,234.56' },
    ];

    return (
        <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Visão Geral</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-lg shadow-lg transition-transform transform hover:-translate-y-1">
                        <h3 className="text-lg font-semibold text-gray-400 mb-2">{stat.title}</h3>
                        <p className="text-4xl font-bold text-white">{stat.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardPage;