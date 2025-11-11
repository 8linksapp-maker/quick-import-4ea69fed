
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import LoginPage from './pages/LoginPage';
import MyCoursesPage from './pages/MyCoursesPage';
import CourseOverviewPage from './pages/CourseOverviewPage';
import LessonPage from './pages/LessonPage';
import BrowsePage from './pages/BrowsePage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import ManageVpsPage from './pages/ManageVpsPage';
import ManageWordPressPage from './pages/ManageWordPressPage';

import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import EditMainPage from './pages/admin/EditMainPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import ManageCoursesPage from './pages/admin/ManageCoursesPage';
import ManageApisPage from './pages/admin/ManageApisPage';
import ManagePromptsPage from './pages/admin/ManagePromptsPage';
import CourseContentEditorPage from './pages/admin/CourseContentEditorPage'; // Import the new page

import ProtectedRoute from './src/ProtectedRoute';
import GuestRoute from './src/GuestRoute';

const router = createBrowserRouter([
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
                path: 'course/:courseId',
                element: <CourseOverviewPage />,
            },
            {
                path: 'course/:courseId/lesson/:lessonId',
                element: <LessonPage />,
            },
            {
                path: 'account-settings',
                element: <AccountSettingsPage />,
            },
            {
                path: 'manage-vps',
                element: <ManageVpsPage />,
            },
            {
                path: 'manage-wordpress',
                element: <ManageWordPressPage />,
            },
        ],
    },
    {
        path: '/login',
        element: (
            <GuestRoute>
                <LoginPage />
            </GuestRoute>
        ),
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
                path: 'edit-main-page',
                element: <EditMainPage />,
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
                path: 'manage-apis',
                element: <ManageApisPage />,
            },
            {
                path: 'manage-prompts',
                element: <ManagePromptsPage />,
            },
            {
                path: 'editor/curso/:courseId',
                element: <CourseContentEditorPage />,
            },
        ],
    }
]);

const Router: React.FC = () => {
    return <RouterProvider router={router} />;
};

export default Router;
