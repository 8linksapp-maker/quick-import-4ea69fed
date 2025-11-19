import React, { useState } from 'react';

const InstallSslForm = ({ sites, onSubmit, onCancel }) => {
    const [domain, setDomain] = useState(sites[0] || '');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ domain }); }}>
            <label htmlFor="sslDomain" className="block text-sm font-medium text-gray-300 mb-2">Selecione o Site</label>
            <select id="sslDomain" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                {sites.map(site => <option key={site} value={site}>{site}</option>)}
            </select>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={!domain} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
                    Instalar SSL
                </button>
            </div>
        </form>
    );
};

export default InstallSslForm;