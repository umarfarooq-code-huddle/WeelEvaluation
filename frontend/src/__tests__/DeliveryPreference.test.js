import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import DeliveryPreference from '../pages/DeliveryPreference';
import api from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    setAuthToken: jest.fn(),
  },
}));

const renderDeliveryPreference = () => {
  localStorage.setItem('token', 'test-token');
  api.get.mockResolvedValue({ id: 1, email: 'test@example.com' });
  api.post.mockResolvedValue({ id: 1, type: 'IN_STORE', datetime: '2025-11-08T12:00:00Z' });

  return render(
    <MemoryRouter>
      <AuthProvider>
        <DeliveryPreference />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('DeliveryPreference', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders delivery form', async () => {
    renderDeliveryPreference();
    await waitFor(() => {
      expect(screen.getByLabelText(/delivery type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument();
    });
  });

  it('validates delivery type is required', async () => {
    const user = userEvent.setup();
    renderDeliveryPreference();

    await waitFor(() => {
      expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument();
    });

    const datetimeInput = screen.getByLabelText(/date & time/i);
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    await user.type(datetimeInput, futureDate.toISOString().slice(0, 16));

    await user.click(screen.getByRole('button', { name: /create order/i }));

    await waitFor(() => {
      expect(screen.getByText(/delivery type is required/i)).toBeInTheDocument();
    });
  });

  it('shows address field only for DELIVERY type', async () => {
    const user = userEvent.setup();
    renderDeliveryPreference();

    await waitFor(() => {
      expect(screen.getByLabelText(/delivery type/i)).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/delivery address/i)).not.toBeInTheDocument();

    const deliveryTypeSelect = screen.getByLabelText(/delivery type/i);
    await user.selectOptions(deliveryTypeSelect, 'DELIVERY');

    await waitFor(() => {
      expect(screen.getByLabelText(/delivery address/i)).toBeInTheDocument();
    });

    await user.selectOptions(deliveryTypeSelect, 'IN_STORE');

    await waitFor(() => {
      expect(screen.queryByLabelText(/delivery address/i)).not.toBeInTheDocument();
    });
  });

  it('validates address is required for DELIVERY', async () => {
    const user = userEvent.setup();
    renderDeliveryPreference();

    await waitFor(() => {
      expect(screen.getByLabelText(/delivery type/i)).toBeInTheDocument();
    });

    const deliveryTypeSelect = screen.getByLabelText(/delivery type/i);
    await user.selectOptions(deliveryTypeSelect, 'DELIVERY');

    const datetimeInput = screen.getByLabelText(/date & time/i);
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    await user.type(datetimeInput, futureDate.toISOString().slice(0, 16));

    await user.click(screen.getByRole('button', { name: /create order/i }));

    await waitFor(() => {
      expect(screen.getByText(/address is required for delivery/i)).toBeInTheDocument();
    });
  });

  it('validates datetime must be in the future', async () => {
    const user = userEvent.setup();
    renderDeliveryPreference();

    await waitFor(() => {
      expect(screen.getByLabelText(/delivery type/i)).toBeInTheDocument();
    });

    const deliveryTypeSelect = screen.getByLabelText(/delivery type/i);
    await user.selectOptions(deliveryTypeSelect, 'IN_STORE');

    const datetimeInput = screen.getByLabelText(/date & time/i);
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);
    await user.type(datetimeInput, pastDate.toISOString().slice(0, 16));

    await user.click(screen.getByRole('button', { name: /create order/i }));

    await waitFor(() => {
      expect(screen.getByText(/date and time must be in the future/i)).toBeInTheDocument();
    });
  });

  it('persists form data to localStorage', async () => {
    const user = userEvent.setup();
    renderDeliveryPreference();

    await waitFor(() => {
      expect(screen.getByLabelText(/delivery type/i)).toBeInTheDocument();
    });

    const deliveryTypeSelect = screen.getByLabelText(/delivery type/i);
    await user.selectOptions(deliveryTypeSelect, 'IN_STORE');

    const datetimeInput = screen.getByLabelText(/date & time/i);
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    await user.type(datetimeInput, futureDate.toISOString().slice(0, 16));

    await waitFor(() => {
      const saved = localStorage.getItem('deliveryForm');
      expect(saved).toBeTruthy();
      const formData = JSON.parse(saved);
      expect(formData.deliveryType).toBe('IN_STORE');
    });
  });

  it('submits order on valid form', async () => {
    const user = userEvent.setup();
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    renderDeliveryPreference();

    await waitFor(() => {
      expect(screen.getByLabelText(/delivery type/i)).toBeInTheDocument();
    });

    const deliveryTypeSelect = screen.getByLabelText(/delivery type/i);
    await user.selectOptions(deliveryTypeSelect, 'IN_STORE');

    const datetimeInput = screen.getByLabelText(/date & time/i);
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    await user.type(datetimeInput, futureDate.toISOString().slice(0, 16));

    await user.click(screen.getByRole('button', { name: /create order/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/orders', expect.objectContaining({
        type: 'IN_STORE',
      }));
    });
  });

  it('calls AI suggest time endpoint', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({
      suggested_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      reason: 'Mocked suggestion',
    });

    renderDeliveryPreference();

    await waitFor(() => {
      expect(screen.getByLabelText(/delivery type/i)).toBeInTheDocument();
    });

    const deliveryTypeSelect = screen.getByLabelText(/delivery type/i);
    await user.selectOptions(deliveryTypeSelect, 'IN_STORE');

    const suggestButton = screen.getByRole('button', { name: /suggest time/i });
    await user.click(suggestButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/ai/suggest-time', {
        delivery_type: 'IN_STORE',
      });
    });
  });

  it('disables suggest button when delivery type not selected', async () => {
    renderDeliveryPreference();

    await waitFor(() => {
      const suggestButton = screen.getByRole('button', { name: /suggest time/i });
      expect(suggestButton).toBeDisabled();
    });
  });
});

