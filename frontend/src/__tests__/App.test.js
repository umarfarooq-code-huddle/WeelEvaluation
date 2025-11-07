import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import api from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    setAuthToken: jest.fn(),
    interceptors: {
      response: {
        use: jest.fn(),
      },
    },
  },
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('redirects to login when not authenticated', () => {
    api.get.mockRejectedValue(new Error('Unauthorized'));

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('redirects authenticated user from login to delivery', async () => {
    localStorage.setItem('token', 'test-token');
    api.get.mockResolvedValue({ id: 1, email: 'test@example.com' });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/delivery preference/i)).toBeInTheDocument();
    });
  });

  it('protects delivery route', () => {
    api.get.mockRejectedValue(new Error('Unauthorized'));

    render(
      <MemoryRouter initialEntries={['/delivery']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('protects summary route', () => {
    api.get.mockRejectedValue(new Error('Unauthorized'));

    render(
      <MemoryRouter initialEntries={['/summary']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});

