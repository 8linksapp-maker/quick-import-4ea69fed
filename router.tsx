
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import LoginPage from './pages/LoginPage';
import MyCoursesPage from './pages/MyCoursesPage';
import CourseOverviewPage from './pages/CourseOverviewPage';
import LessonPage from './pages/LessonPage';
import BrowsePage from './pages/BrowsePage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import BlogHousePage from './pages/BlogHousePage'; // Import the new page
import VpsDetailsPage from './pages/VpsDetailsPage';

import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import ManageCoursesPage from './pages/admin/ManageCoursesPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import ManagePromptsPage from './pages/admin/ManagePromptsPage';
import ManageApisPage from './pages/admin/ManageApisPage';
import EditMainPage from './pages/admin/EditMainPage';
import CourseContentEditorPage from './pages/admin/CourseContentEditorPage';

import ProtectedRoute from '@/ProtectedRoute';
import GuestRoute from '@/GuestRoute';
import ProductAccessRoute from '@/ProductAccessRoute';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const router = createBrowserRouter([
    {
        path: '/login',
        element: (
            <GuestRoute>
                <LoginPage />
            </GuestRoute>
        ),
    },
    {
        path: '/forgot-password',
        element: (
            <GuestRoute>
                <ForgotPasswordPage />
            </GuestRoute>
        ),
    },
    {
        path: '/reset-password',
        element: <ResetPasswordPage />,
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <App />
            </ProtectedRoute>
        ),
        children: [
            {
                path: '',
                element: <BrowsePage />,
            },
            {
                path: 'my-courses',
                element: <MyCoursesPage />,
            },
            {
                element: <ProductAccessRoute productId="8" salesPageUrl="/#my-courses" productName="o curso" />,
                children: [
                    {
                        path: 'course/:courseId',
                        element: <CourseOverviewPage />,
                    },
                    {
                        path: 'course/:courseId/lesson/:lessonId',
                        element: <LessonPage />,
                    },
                ]
            },
            {
                path: 'account-settings',
                element: <AccountSettingsPage />,
            },
            {
                element: <ProductAccessRoute productId="8" salesPageUrl="https://www.bloghouse.com.br/" productName="Blog House" />,
                children: [
                    {
                        path: 'blog-house',
                        element: <BlogHousePage />,
                    },
                ]
            },
        ],
    },
    {
        path: '/admin',
        element: (
            <ProtectedRoute>
                <AdminLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                path: '',
                element: <DashboardPage />,
            },
            {
                path: 'dashboard',
                element: <DashboardPage />,
            },
            {
                path: 'manage-users',
                element: <ManageUsersPage />,
            },
            {
                path: 'manage-courses',
                element: <ManageCoursesPage />,
            },
            {
                path: 'editor/curso/:courseId',
                element: <CourseContentEditorPage />,
            },
            {
                path: 'manage-prompts',
                element: <ManagePromptsPage />,
            },
            {
                path: 'manage-apis',
                element: <ManageApisPage />,
            },
            {
                path: 'edit-main-page',
                element: <EditMainPage />,
            },
        ],
    },
]);

const Router: React.FC = () => {
    return <RouterProvider router={router} />;
};

export default Router;
