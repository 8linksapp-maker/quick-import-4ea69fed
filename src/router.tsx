import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import LoginPage from './pages/LoginPage';
import MyCoursesPage from './pages/MyCoursesPage';
import CourseOverviewPage from './pages/CourseOverviewPage';
import LessonPage from './pages/LessonPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: '',
        element: <div>Browse Page</div>,
      },
      {
        path: 'my-courses',
        element: <MyCoursesPage onCardClick={() => {}} onCarouselHoverChange={() => {}} onShowDetails={() => {}} />,
      },
      {
        path: 'course/:courseId',
        element: <CourseOverviewPage course={{} as any} onLessonClick={() => {}} />,
      },
      {
        path: 'course/:courseId/lesson/:lessonId',
        element: <LessonPage course={{} as any} lesson={{} as any} />,
      },
    ],
  },
]);

const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default Router;