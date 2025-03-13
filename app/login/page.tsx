'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = "https://attakan.pythonanywhere.com";

const PageContainer = (props) => (
  <div 
    className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat"
    style={{
      backgroundImage: "url('/images/LoginBG-01.png')",
    }}
  >
    <div 
      className="absolute top-1/2 transform -translate-y-1/2 bg-white p-8 rounded-lg shadow-md w-96 bg-opacity-90"
      style={{ left: '15%' }}  // Change this percentage as needed
    >
      {props.children}
    </div>
  </div>
);

const LoginPage = ({ setPage }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('lastLogin', data.last_login);

      // Redirect (you can adjust the logic based on role if needed)
      router.push('/dashboard');

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/images/LoginBG-01.png')",
      }}
    >
      <div 
        className="absolute top-1/2 transform -translate-y-1/2 bg-white p-8 rounded-lg shadow-md w-96 bg-opacity-90"
        style={{ left: '15%' }}
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-black">
          Welcome to Harley Davidson Supplier Quality Tracking
        </h2>
        <h3 className="text-xl font-semibold mb-4 text-center">Log-in</h3>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              USERNAME
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Your Username"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              PASSWORD
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Signing in...' : 'SIGNIN'}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-sm">
          <button 
            onClick={() => setPage('register')} 
            className="text-blue-600 hover:underline"
          >
            Register Email
          </button>
          <button 
            onClick={() => setPage('forgotPassword')} 
            className="text-blue-600 hover:underline"
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = ({ setPage }) => (
  <PageContainer>
    <h2 className="text-2xl font-bold mb-6 text-center text-black">Register</h2>
    <form onSubmit={(e) => { e.preventDefault(); setPage('login'); }}>
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">NAME</label>
        <input type="text" id="name" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Full Name" />
      </div>
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">EMAIL</label>
        <input type="email" id="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Your Email" />
      </div>
      <div className="mb-4">
        <label htmlFor="supplierCode" className="block text-sm font-medium text-gray-700">SUPPLIER CODE</label>
        <input type="text" id="supplierCode" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="xxxxx" />
      </div>
      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">PASSWORD</label>
        <input type="password" id="password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="*********" />
      </div>
      <div className="mb-6">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">RECONFIRM PASSWORD</label>
        <input type="password" id="confirmPassword" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="*********" />
      </div>
      <button 
        type="submit" 
        className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600"
      >
        REGISTER
      </button>
    </form>
    <div className="mt-4 text-center">
      <button onClick={() => setPage('login')} className="text-blue-600 hover:underline flex items-center justify-center">
        <ArrowLeft className="mr-1" size={16} />
        Back to Login
      </button>
    </div>
  </PageContainer>
);

const ForgotPasswordPage = ({ setPage }) => (
  <PageContainer>
    <h2 className="text-2xl font-bold mb-6 text-center text-black">Forgot Password</h2>
    <p className="mb-4 text-sm text-gray-600 text-center">Please enter your email to reset the password</p>
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="mb-6">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">EMAIL or USER ID</label>
        <input type="text" id="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Your Email or User ID" />
      </div>
      <button 
        type="button" 
        onClick={() => setPage('forgotPassword2')} 
        className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600"
      >
        Reset Password
      </button>
    </form>
    <div className="mt-4 text-center">
      <button onClick={() => setPage('login')} className="text-blue-600 hover:underline flex items-center justify-center">
        <ArrowLeft className="mr-1" size={16} />
        Back to Login
      </button>
    </div>
  </PageContainer>
);

const ForgotPasswordPage2 = ({ setPage }) => (
  <PageContainer>
    <h2 className="text-2xl font-bold mb-6 text-center text-black">Forgot Password</h2>
    <p className="mb-4 text-sm text-gray-600 text-center">We sent a reset link to your email. Enter the verification code below.</p>
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="mb-6 flex justify-between">
        {[...Array(5)].map((_, index) => (
          <input
            key={index}
            type="text"
            maxLength="1"
            className="w-12 h-12 text-center text-2xl border border-gray-300 rounded-md shadow-sm"
          />
        ))}
      </div>
      <button 
        type="button"
        onClick={() => setPage('forgotPassword3')} 
        className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600"
      >
        Reset Password
      </button>
    </form>
    <div className="mt-4 text-center">
      <button onClick={() => setPage('login')} className="text-blue-600 hover:underline flex items-center justify-center">
        <ArrowLeft className="mr-1" size={16} />
        Back to Login
      </button>
    </div>
  </PageContainer>
);

const ForgotPasswordPage3 = ({ setPage }) => (
  <PageContainer>
    <h2 className="text-2xl font-bold mb-6 text-center text-black">Set a new password</h2>
    <p className="mb-4 text-sm text-gray-600 text-center">Create a new password. Ensure it differs from previous ones for security.</p>
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="mb-4">
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
        <input type="password" id="newPassword" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Enter new password" />
      </div>
      <div className="mb-6">
        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">Reconfirm New Password</label>
        <input type="password" id="confirmNewPassword" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Re-enter new password" />
      </div>
      <button 
        type="button"
        onClick={() => setPage('login')}
        className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600"
      >
        Update Password
      </button>
    </form>
  </PageContainer>
);

const LoginFlow = () => {
  const [currentPage, setCurrentPage] = useState('login');

  return (
    <div>
      {currentPage === 'login' && <LoginPage setPage={setCurrentPage} />}
      {currentPage === 'register' && <RegisterPage setPage={setCurrentPage} />}
      {currentPage === 'forgotPassword' && <ForgotPasswordPage setPage={setCurrentPage} />}
      {currentPage === 'forgotPassword2' && <ForgotPasswordPage2 setPage={setCurrentPage} />}
      {currentPage === 'forgotPassword3' && <ForgotPasswordPage3 setPage={setCurrentPage} />}
    </div>
  );
};

export default LoginFlow;
