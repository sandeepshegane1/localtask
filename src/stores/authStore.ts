import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/axios';
import { toast } from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'PROVIDER';
  category?: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: 'CLIENT' | 'PROVIDER';
    category?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      register: async (data) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await api.post('/auth/register', data);
          const { user, token } = response.data;

          // Set auth state
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });

          // Store token in localStorage
          localStorage.setItem('token', token);
          
          // Set token in axios defaults
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          toast.success('Registration successful!');
        } catch (error: any) {
          console.error('Registration error:', error);
          const errorMessage = error.response?.data?.error || 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await api.post('/auth/login', { email, password });
          const { user, token } = response.data;

          // Set auth state
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });

          // Store token in localStorage
          localStorage.setItem('token', token);
          
          // Set token in axios defaults
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          toast.success('Login successful!');
        } catch (error: any) {
          console.error('Login error:', error);
          const errorMessage = error.response?.data?.error || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      logout: () => {
        // Clear auth state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });

        // Remove token from localStorage
        localStorage.removeItem('token');
        
        // Remove token from axios defaults
        delete api.defaults.headers.common['Authorization'];

        toast.success('Logged out successfully');
      },

      updateUser: async (userData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await api.patch('/auth/update-profile', userData);
          const updatedUser = response.data;

          set((state) => ({
            user: { ...state.user, ...updatedUser },
            isLoading: false
          }));

          toast.success('Profile updated successfully');
        } catch (error: any) {
          console.error('Profile update error:', error);
          const errorMessage = error.response?.data?.error || 'Failed to update profile';
          set({ error: errorMessage, isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
