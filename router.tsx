
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
// ... (rest of admin imports)

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
            // ... (other children routes)
            {
                path: 'account-settings',
                element: <AccountSettingsPage />,
            },
            {
                path: 'blog-house',
                element: <BlogHousePage />,
            },
        ],
    },
    // ... (rest of the routes)
]);

const Router: React.FC = () => {
    return <RouterProvider router={router} />;
};

export default Router;
