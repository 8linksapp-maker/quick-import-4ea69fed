import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export const useCourseAccess = (courseId: string | undefined) => {
    const { user } = useAuth();
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkCourseAccess = async () => {
            if (user && courseId) {
                try {
                    const { data, error } = await supabase
                        .from('subscriptions')
                        .select('id, end_date')
                        .eq('user_id', user.id)
                        .eq('course_id', courseId)
                        .single();

                    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                        throw error;
                    }

                    if (!data) {
                        setHasAccess(false);
                    } else {
                        // If there's a subscription, check the end_date.
                        // Access is granted if end_date is null (never expires) or in the future.
                        const hasExpired = data.end_date && new Date(data.end_date) < new Date();
                        setHasAccess(!hasExpired);
                    }
                } catch (error: any) {
                    console.error('Error checking course access:', error.message);
                    setHasAccess(false);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        checkCourseAccess();
    }, [user, courseId]);

    return { hasAccess, loading };
};
