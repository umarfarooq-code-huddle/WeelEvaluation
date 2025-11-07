import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import PrivateRoute from '../components/PrivateRoute';
import api from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    setAuthToken: jest.fn(),
  },
}));

const TestComponent = () => <div>Protected Content</div>;

describe('PrivateRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('redirects to login when user is not authenticated', () => {
    api.get.mockRejectedValue(new Error('Unauthorized'));

    render(
      <BrowserRouter>
        <AuthProvider>
          <PrivateRoute>
            <TestComponent />
          </PrivateRoute>
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', async () => {
    localStorage.setItem('token', 'test-token');
    api.get.mockResolvedValue({ id: 1, email: 'test@example.com' });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <PrivateRoute>
            <TestComponent />
          </PrivateRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Protected Content');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state while checking authentication', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <AuthProvider>
          <PrivateRoute>
            <TestComponent />
          </PrivateRoute>
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

