import React, { useEffect, useState } from 'react';
import { formatRelative } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useDocumentTitle from '../../src/hooks/useDocumentTitle';
import { supabase } from '../../src/supabaseClient';
import { UsersIcon, AcademicCapIcon, AddIcon } from '../../components/Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface User {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string;
}

interface Course {
    id: string;
    title?: string;
    created_at: string;
}

interface ChartData {
    date: string;
    count: number;
}

interface ActivityData {
    name: string;
    value: number;
}

const DashboardPage: React.FC = () => {
    useDocumentTitle('Admin: Visão Geral');

    const [userCount, setUserCount] = useState<number>(0);
    const [newUsersCount, setNewUsersCount] = useState<number>(0);
    const [courseCount, setCourseCount] = useState<number>(0);
    const [recentLoginUsers, setRecentLoginUsers] = useState<User[]>([]);
    const [recentCourses, setRecentCourses] = useState<Course[]>([]);
    const [userChartData, setUserChartData] = useState<ChartData[]>([]);
    const [userActivityData, setUserActivityData] = useState<ActivityData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch Users
                const { data: usersResponse, error: usersError } = await supabase.functions.invoke('get-users', { body: {} });
                if (usersError) throw new Error(`Erro ao buscar usuários: ${usersError.message}`);
                
                const usersData = usersResponse.users;
                if (usersData && Array.isArray(usersData)) {
                    setUserCount(usersData.length);
                    
                    const now = new Date();
                    const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
                    const sevenDaysAgo = new Date(new Date().setDate(now.getDate() - 7));

                    let active7d = 0;
                    let active30d = 0;
                    let inactive = 0;

                    usersData.forEach((user: User) => {
                        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
                        if (lastSignIn && lastSignIn > sevenDaysAgo) {
                            active7d++;
                        } else if (lastSignIn && lastSignIn > thirtyDaysAgo) {
                            active30d++;
                        } else {
                            inactive++;
                        }
                    });

                    setUserActivityData([
                        { name: 'Ativos (7d)', value: active7d },
                        { name: 'Ativos (30d)', value: active30d },
                        { name: 'Inativos (>30d)', value: inactive },
                    ]);
                    
                    const newUsers = usersData.filter((user: User) => new Date(user.created_at) > thirtyDaysAgo);
                    setNewUsersCount(newUsers.length);
                    
                    const usersWithLogin = usersData.filter((user: User) => user.last_sign_in_at);
                    const sortedByLogin = [...usersWithLogin].sort((a, b) => new Date(b.last_sign_in_at!).getTime() - new Date(a.last_sign_in_at!).getTime());
                    setRecentLoginUsers(sortedByLogin.slice(0, 5));
                }

                // Fetch Courses
                const { data: coursesResponse, error: coursesError } = await supabase.functions.invoke('get-courses', { body: {} });
                if (coursesError) throw new Error(`Erro ao buscar cursos: ${coursesError.message}`);
                const coursesData = coursesResponse.data;
                if (coursesData && Array.isArray(coursesData)) {
                    setCourseCount(coursesData.length);
                    const sortedCourses = [...coursesData].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    setRecentCourses(sortedCourses.slice(0, 5));
                }
                
                // Fetch Chart Data
                const { data: chartResponse, error: chartError } = await supabase.functions.invoke('get-daily-stats');
                if (chartError) {
                    console.error("Chart data error:", chartError);
                } else if (chartResponse.data) {
                    setUserChartData(chartResponse.data);
                }

            } catch (err: any) {
                setError(err.message || 'Ocorreu um erro desconhecido.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const stats = [
        { title: 'Total de Usuários', value: userCount, icon: <UsersIcon /> },
        { title: 'Novos Usuários (30d)', value: newUsersCount, icon: <AddIcon /> },
        { title: 'Total de Cursos', value: courseCount, icon: <AcademicCapIcon /> },
    ];

    const ACTIVITY_COLORS = ['#00C49F', '#FFBB28', '#8884d8'];

    const StatCard: React.FC<{ stat: typeof stats[0] }> = ({ stat }) => (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-lg shadow-lg flex items-center space-x-4">
            <div className="bg-black/20 p-3 rounded-lg">
                {React.cloneElement(stat.icon, { className: 'w-6 h-6 text-white' })}
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-400">{stat.title}</h3>
                <p className="text-4xl font-bold text-white">{stat.value}</p>
            </div>
        </div>
    );

    return (
        <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Visão Geral</h2>
            
            {loading && <div className="text-center text-white">Carregando dados...</div>}
            
            {error && (
                <div className="bg-red-900 border border-red-700 text-white p-4 rounded-lg mb-6">
                    <h3 className="font-bold">Erro ao carregar o painel</h3>
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stats.map((stat, index) => (
                            <StatCard key={index} stat={stat} />
                        ))}
                    </div>

                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-lg shadow-lg">
                            <h3 className="text-xl font-bold mb-4">Últimos Acessos</h3>
                            <ul className="space-y-4">
                                {recentLoginUsers.map(user => (
                                    <li key={user.id} className="flex justify-between items-center text-sm">
                                        <span>{user.email || 'Email não disponível'}</span>
                                        <span className="text-gray-400">
                                            {user.last_sign_in_at ? formatRelative(new Date(user.last_sign_in_at), new Date(), { locale: ptBR }) : 'Nunca'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-lg shadow-lg flex flex-col">
                            <h3 className="text-xl font-bold mb-4">Atividade dos Usuários</h3>
                            <div className="flex-grow w-full h-full">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie 
                                            data={userActivityData} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={60} 
                                            outerRadius={80} 
                                            paddingAngle={5}
                                            labelLine={false}
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                return (
                                                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                        {`${(percent * 100).toFixed(0)}%`}
                                                    </text>
                                                );
                                            }}
                                        >
                                            {userActivityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-lg shadow-lg">
                            <h3 className="text-xl font-bold mb-4">Cursos Recentes</h3>
                            <ul className="space-y-3">
                                {recentCourses.map(course => (
                                     <li key={course.id} className="text-sm p-2 bg-black/10 rounded">
                                        {course.title || 'Título não disponível'}
                                     </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-8 bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-bold mb-4">Novos Usuários (Últimos 30 dias)</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={userChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.7)" fontSize={12} tickFormatter={(tick) => new Date(tick).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} />
                                    <YAxis stroke="rgba(255, 255, 255, 0.7)" />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)' }} />
                                    <Bar dataKey="count" fill="rgba(130, 200, 255, 0.8)" name="Novos usuários" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DashboardPage;