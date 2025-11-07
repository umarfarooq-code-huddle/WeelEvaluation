import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Summary from '../pages/Summary';
import api from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    setAuthToken: jest.fn(),
  },
}));

const renderSummary = (orderId = '1') => {
  localStorage.setItem('token', 'test-token');
  api.get.mockImplementation((url) => {
    if (url === '/me') {
      return Promise.resolve({ id: 1, email: 'test@example.com' });
    }
    if (url === `/orders/${orderId}`) {
      return Promise.resolve({
        id: 1,
        user_id: 1,
        type: 'IN_STORE',
        datetime: '2025-11-08T12:00:00Z',
        notes: 'Test notes',
      });
    }
    return Promise.reject(new Error('Not found'));
  });

  return render(
    <MemoryRouter initialEntries={[`/summary?orderId=${orderId}`]}>
      <AuthProvider>
        <Summary />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Summary', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('displays loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderSummary();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays user and order information', async () => {
    renderSummary();

    await waitFor(() => {
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/order id/i)).toBeInTheDocument();
    expect(screen.getByText(/delivery type/i)).toBeInTheDocument();
    expect(screen.getByText(/in store/i)).toBeInTheDocument();
  });

  it('displays error when order not found', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/me') {
        return Promise.resolve({ id: 1, email: 'test@example.com' });
      }
      return Promise.reject(new Error('Not found'));
    });

    renderSummary('999');

    await waitFor(() => {
      expect(screen.getByText(/failed to load order/i)).toBeInTheDocument();
    });
  });

  it('displays error when no order ID provided', async () => {
    localStorage.setItem('token', 'test-token');
    api.get.mockResolvedValue({ id: 1, email: 'test@example.com' });

    render(
      <MemoryRouter initialEntries={['/summary']}>
        <AuthProvider>
          <Summary />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no order id provided/i)).toBeInTheDocument();
    });
  });

  it('navigates back to delivery on edit', async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);

    renderSummary();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit order/i })).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit order/i });
    editButton.click();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/delivery');
    });
  });

  it('clears localStorage and logs out on sign out', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('deliveryForm', '{}');

    renderSummary();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    signOutButton.click();

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  it('displays order notes when present', async () => {
    renderSummary();

    await waitFor(() => {
      expect(screen.getByText(/test notes/i)).toBeInTheDocument();
    });
  });

  it('formats datetime correctly', async () => {
    renderSummary();

    await waitFor(() => {
      const dateTimeText = screen.getByText(/2025-11-08/i);
      expect(dateTimeText).toBeInTheDocument();
    });
  });
});

