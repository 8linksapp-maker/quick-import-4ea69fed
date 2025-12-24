import React, { useState, useEffect } from 'react';
import { supabase } from '../../src/supabaseClient';
import FileUpload from './FileUpload';
import Modal from '../Modal';

// Keep the interface exportable for other components
export interface Course {
    id: number;
    title: string;
    description: string | null;
    instructor: string | null;
    category: string | null;
    poster_url: string | null;
    sales_page_url?: string; // ADDED
    is_for_sale?: boolean;
    kiwify_product_ids?: string[];
    price?: number;
}

interface KiwifyProduct {
    id: string;
    name: string;
}

interface CourseEditorProps {
    onClose: () => void;
    onCourseSaved: () => void;
    courseToEdit: Course | null;
}

const CourseEditor: React.FC<CourseEditorProps> = ({ onClose, onCourseSaved, courseToEdit }) => {
    // State for the form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [instructor, setInstructor] = useState('');
    const [category, setCategory] = useState('');
    const [posterUrl, setPosterUrl] = useState<string | null>(null);
    const [salesPageUrl, setSalesPageUrl] = useState(''); // ADDED
    const [isForSale, setIsForSale] = useState(false);
    const [kiwifyProductIds, setKiwifyProductIds] = useState<string[]>([]);
    const [price, setPrice] = useState(0);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isKiwifyModalOpen, setIsKiwifyModalOpen] = useState(false);
    const [kiwifyProducts, setKiwifyProducts] = useState<KiwifyProduct[]>([]);

    // Effect to populate form if we are editing
    useEffect(() => {
        if (courseToEdit) {
            setTitle(courseToEdit.title);
            setDescription(courseToEdit.description || '');
            setInstructor(courseToEdit.instructor || '');
            setCategory(courseToEdit.category || '');
            setPosterUrl(courseToEdit.poster_url || '');
            setSalesPageUrl(courseToEdit.sales_page_url || ''); // ADDED
            setIsForSale(courseToEdit.is_for_sale || false);
            setKiwifyProductIds(courseToEdit.kiwify_product_ids || []);
            setPrice(courseToEdit.price || 0);
        } else {
            // Reset form when adding a new course
            setTitle('');
            setDescription('');
            setInstructor('');
            setCategory('');
            setPosterUrl(null);
            setSalesPageUrl(''); // ADDED
            setIsForSale(false);
            setKiwifyProductIds([]);
            setPrice(0);
        }
    }, [courseToEdit]);

    const fetchKiwifyProducts = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('get-kiwify-products');
            console.log('Kiwify products data:', data);
            if (error) throw error;
            setKiwifyProducts(data.products.data);
        } catch (error: any) {
            console.error('Error fetching Kiwify products:', error.message);
        }
    };

    const openKiwifyModal = () => {
        fetchKiwifyProducts();
        setIsKiwifyModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!posterUrl) {
            setError('Por favor, envie uma imagem para o pôster.');
            setLoading(false);
            return;
        }

        const courseData = { 
            title, 
            description, 
            instructor, 
            category, 
            poster_url: posterUrl,
            sales_page_url: salesPageUrl, // ADDED
            is_for_sale: isForSale, 
            kiwify_product_ids: kiwifyProductIds,
            price 
        };

        try {
            if (courseToEdit) {
                const { error } = await supabase.functions.invoke('update-course', {
                    body: { id: courseToEdit.id, ...courseData },
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.functions.invoke('create-course', {
                    body: { course: courseData },
                });
                if (error) throw error;
            }
            onCourseSaved(); // Refresh the list
            onClose();       // Close the modal
        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectKiwifyProduct = (productId: string) => {
        if (!kiwifyProductIds.includes(productId)) {
            setKiwifyProductIds([...kiwifyProductIds, productId]);
        }
        setIsKiwifyModalOpen(false);
    };

    const handleRemoveKiwifyProduct = (idToRemove: string) => {
        setKiwifyProductIds(kiwifyProductIds.filter(id => id !== idToRemove));
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Título do Curso</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white" required />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                    <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white"></textarea>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="instructor" className="block text-sm font-medium text-gray-300 mb-2">Instrutor</label>
                        <input type="text" id="instructor" value={instructor} onChange={(e) => setInstructor(e.target.value)} className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white" />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
                        <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white" />
                    </div>
                </div>
                <FileUpload label="Pôster do Curso" bucketName="course_assets" onUpload={(url) => setPosterUrl(url)} />
                {posterUrl && courseToEdit && <img src={posterUrl} alt="Preview" className="w-32 h-auto mt-2"/>}
                
                <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-bold mb-4">Configuração de Venda</h3>
                    
                    <div>
                        <label htmlFor="sales_page_url" className="block text-sm font-medium text-gray-300 mb-2">Link da Página de Vendas</label>
                        <input type="url" id="sales_page_url" value={salesPageUrl} onChange={(e) => setSalesPageUrl(e.target.value)} placeholder="https://..." className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white" />
                    </div>

                    <div className="flex items-center my-4">
                        <input type="checkbox" id="is_for_sale" checked={isForSale} onChange={(e) => setIsForSale(e.target.checked)} className="h-4 w-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500" />
                        <label htmlFor="is_for_sale" className="ml-2 block text-sm text-gray-300">Disponível para venda</label>
                    </div>

                    {isForSale && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">IDs de Produto Kiwify Vinculados</label>
                                <div className="space-y-2">
                                    {kiwifyProductIds.map(id => (
                                        <div key={id} className="flex items-center justify-between bg-black/20 border border-white/20 rounded-md p-2">
                                            <span className="text-white font-mono text-sm">{id}</span>
                                            <button type="button" onClick={() => handleRemoveKiwifyProduct(id)} className="text-red-500 hover:text-red-400 font-bold">&times;</button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={openKiwifyModal} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Vincular Novo Produto</button>
                            </div>
                        </div>
                    )}
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="mr-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-md">Cancelar</button>
                    <button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md disabled:opacity-50">
                        {loading ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>

            {isKiwifyModalOpen && (
                <Modal isOpen={isKiwifyModalOpen} onClose={() => setIsKiwifyModalOpen(false)} title="Vincular Produto Kiwify">
                    <div className="p-6">
                        <h3 className="text-lg font-bold mb-4">Selecione um produto da sua conta Kiwify</h3>
                        <ul>
                            {kiwifyProducts.map(product => (
                                <li key={product.id} onClick={() => handleSelectKiwifyProduct(product.id)} className="p-4 hover:bg-gray-700 cursor-pointer rounded-md">
                                    {product.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Modal>
            )}
        </>
    )
}

export default CourseEditor;