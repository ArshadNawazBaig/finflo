import { lazy } from 'react';
import { Route } from 'react-router-dom';
import RedirectIfAuthenticated from '@/components/RedirectIfAuthenticated';

const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const ForcePasswordChange = lazy(() => import('@/pages/auth/ForcePasswordChange'));

const AuthRoutes = () => (
  <Route element={<RedirectIfAuthenticated />}>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="/force-password-change" element={<ForcePasswordChange />} />
  </Route>
);

export default AuthRoutes;
