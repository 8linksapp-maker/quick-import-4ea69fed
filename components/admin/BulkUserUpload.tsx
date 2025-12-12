import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { supabase } from '../../src/supabaseClient'; // Ajuste o caminho se necessário

interface UserData {
  email: string;
  role: string;
  course_id: string;
  data_ultimo_pagamento: string;
  tipo_plano: 'mensal' | 'anual' | 'vitalicio';
}

interface Result {
  status: 'success' | 'updated' | 'error';
  message: string;
}

const BulkUserUpload: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      return;
    }

    setIsLoading(true);
    setResults([]);
    const file = acceptedFiles[0];

    Papa.parse<UserData>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parseResult) => {
        const usersToCreate = parseResult.data.filter(
          (user) => user.email && user.role && user.course_id && user.data_ultimo_pagamento && user.tipo_plano
        );

        if (usersToCreate.length === 0) {
          setResults([{ status: 'error', message: 'Nenhum usuário válido encontrado no arquivo. Verifique o cabeçalho e os dados.' }]);
          setIsLoading(false);
          return;
        }

        try {
          const { data, error } = await supabase.functions.invoke('bulk-create-users', {
            body: { users: usersToCreate },
          });

          if (error) {
            throw error;
          }

          setResults(data.results);
        } catch (error: any) {
          setResults([{ status: 'error', message: `Erro ao chamar a função: ${error.message}` }]);
        } finally {
          setIsLoading(false);
        }
      },
      error: (error: any) => {
        setResults([{ status: 'error', message: `Erro ao ler o arquivo: ${error.message}` }]);
        setIsLoading(false);
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleDownloadTemplate = () => {
    const headers = 'email,role,course_id,data_ultimo_pagamento,tipo_plano';
    const example = 'exemplo@email.com,User,15,25/12/2023,anual';
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${example}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'modelo_usuarios.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg mt-8">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Cadastrar Usuários em Massa</h2>
            <button
                onClick={handleDownloadTemplate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm"
            >
                Baixar Planilha Modelo
            </button>
        </div>
      <p className="text-gray-400 mb-4">
        Use um arquivo CSV com os cabeçalhos: <code>email</code>, <code>role</code>, <code>course_id</code>, <code>data_ultimo_pagamento</code> (no formato DD/MM/AAAA), e <code>tipo_plano</code>.
      </p>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed border-gray-500 rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? 'bg-gray-700 border-blue-500' : 'bg-gray-900 hover:bg-gray-700'
        }`}
      >
        <input {...getInputProps()} />
        {isLoading ? (
          <p className="text-white">Processando...</p>
        ) : isDragActive ? (
          <p className="text-white">Solte o arquivo aqui...</p>
        ) : (
          <p className="text-gray-300">Arraste um arquivo CSV ou clique para selecionar</p>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-white mb-2">Resultados do Processamento:</h3>
          <ul className="bg-gray-900 p-4 rounded-lg max-h-60 overflow-y-auto">
            {results.map((result, index) => (
              <li
                key={index}
                className={`p-2 rounded mb-2 text-sm ${
                  result.status === 'success' || result.status === 'updated' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'
                }`}
              >
                {result.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BulkUserUpload;
