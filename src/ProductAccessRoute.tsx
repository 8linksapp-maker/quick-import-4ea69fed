import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useCourseAccess } from './hooks/useCourseAccess';
import { supabase } from './supabaseClient'; // Import supabase client
import { LockClosedIcon } from '../components/Icons';

// A interface de props não precisa mais de productName ou salesPageUrl
interface ProductAccessRouteProps {
  productId?: string;
}

interface CourseDetails {
    title: string;
    sales_page_url: string | null;
}

const BlockedAccessPage: React.FC<{ courseDetails: CourseDetails | null }> = ({ courseDetails }) => {
    const salesPageUrl = courseDetails?.sales_page_url || '/#my-courses';
    const productName = courseDetails?.title || 'este produto';

    return (
        <div className="bg-[#141414] min-h-screen text-white flex flex-col justify-center items-center text-center p-4 pt-20">
            <LockClosedIcon className="w-16 h-16 text-red-600 mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-lg text-gray-300 max-w-md mb-8">
                Você precisa adquirir o acesso à {productName} para visualizar esta página.
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

const ProductAccessRoute: React.FC<ProductAccessRouteProps> = ({ productId: propProductId }) => {
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams();
  
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

  const dynamicProductId = params.courseId;
  const productId = propProductId ?? dynamicProductId;

  const { hasAccess, loading: accessLoading } = useCourseAccess(productId);

  useEffect(() => {
    const fetchCourseDetails = async () => {
        if (!productId) {
            setDetailsLoading(false);
            return;
        }
        
        setDetailsLoading(true);
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('title, sales_page_url')
                .eq('id', productId)
                .single();

            if (error) throw error;
            
            setCourseDetails(data);
        } catch (error) {
            console.error("Failed to fetch course details:", error);
            setCourseDetails(null);
        } finally {
            setDetailsLoading(false);
        }
    };

    fetchCourseDetails();
  }, [productId]);

  const isLoading = accessLoading || detailsLoading;

  if (isLoading || !productId) {
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
    return <BlockedAccessPage courseDetails={courseDetails} />;
  }

  return <Outlet />;
};

export default ProductAccessRoute;
