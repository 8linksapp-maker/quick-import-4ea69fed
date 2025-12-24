import React from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useCourseAccess } from './hooks/useCourseAccess';
import { LockClosedIcon } from '../components/Icons'; // Importando um ícone de cadeado

interface ProductAccessRouteProps {
  productName?: string;
  productId?: string; // Tornar opcional
  salesPageUrl: string;
}

const BlockedAccessPage: React.FC<{ salesPageUrl: string, productName?: string }> = ({ salesPageUrl, productName }) => {
    return (
        <div className="bg-[#141414] min-h-screen text-white flex flex-col justify-center items-center text-center p-4 pt-20">
            <LockClosedIcon className="w-16 h-16 text-red-600 mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-lg text-gray-300 max-w-md mb-8">
                Você precisa adquirir o acesso à {productName || 'este produto'} para visualizar esta página.
            </p>
            <a
                href={salesPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center bg-red-600 text-white font-semibold px-8 py-3 rounded-md hover:bg-red-700 transition text-lg"
            >
                Quero adquirir agora
            </a>
        </div>
    );
};

const ProductAccessRoute: React.FC<ProductAccessRouteProps> = ({ productId: propProductId, salesPageUrl, productName }) => {
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams();
  
  // Prioriza o ID da prop, mas usa o da URL se a prop não for fornecida.
  const dynamicProductId = params.courseId;
  const productId = propProductId ?? dynamicProductId;

  const { hasAccess, loading: accessLoading } = useCourseAccess(productId);

  if (accessLoading || !productId) { // Adicionado !productId para cobrir casos de carregamento inicial
    return (
      <div className="bg-[#141414] min-h-screen text-white flex justify-center items-center">
        Verificando seu acesso...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasAccess) {
    // Se o usuário está logado mas não tem acesso, mostra a página de bloqueio.
    return <BlockedAccessPage salesPageUrl={salesPageUrl} productName={productName} />;
  }

  // Se tem acesso, renderiza a página solicitada.
  return <Outlet />;
};

export default ProductAccessRoute;
