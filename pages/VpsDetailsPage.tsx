import React from 'react';
import { useParams } from 'react-router-dom';

const VpsDetailsPage: React.FC = () => {
  const { vpsId } = useParams<{ vpsId: string }>();

  return (
    <div className="pt-24 bg-[#141414] min-h-screen text-white p-8">
      <h1 className="text-4xl font-bold tracking-tighter mb-8">Detalhes do VPS</h1>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <p className="text-lg">ID do VPS: {vpsId}</p>
        {/* Aqui você pode buscar e exibir mais detalhes do VPS usando o vpsId */}
      </div>
    </div>
  );
};

export default VpsDetailsPage;
