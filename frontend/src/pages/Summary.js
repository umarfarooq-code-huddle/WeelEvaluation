import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import api from '../api';

const Summary = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

      try {
        const orderData = await api.get(`/orders/${orderId}`);
        setOrder(orderData);
      } catch (err) {
        setError('Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  const handleEdit = () => {
    navigate('/delivery');
  };

  const handleSignOut = () => {
    localStorage.clear();
    logout();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeliveryTypeConfig = (type) => {
    const configs = {
      IN_STORE: { icon: '🏪', label: 'In Store Pickup', color: 'from-blue-500 to-blue-600' },
      DELIVERY: { icon: '🚚', label: 'Home Delivery', color: 'from-primary-500 to-primary-600' },
      CURBSIDE: { icon: '🚗', label: 'Curbside Pickup', color: 'from-purple-500 to-purple-600' },
    };
    return configs[type] || { icon: '📦', label: type, color: 'from-gray-500 to-gray-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-glow mb-4">
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="w-full max-w-md card text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The order you are looking for does not exist.'}</p>
          <Button onClick={handleEdit} className="w-full">Go Back</Button>
        </div>
      </div>
    );
  }

  const deliveryConfig = getDeliveryTypeConfig(order.type);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="w-full max-w-4xl animate-scaleIn">
        <div className="card card-hover">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl shadow-glow-lg mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600 text-lg">Your order has been successfully created</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 border-2 border-primary-200 shadow-medium">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-primary-900">User Information</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">Email</p>
                  <p className="text-base font-bold text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">User ID</p>
                  <p className="text-base font-bold text-gray-900">#{user?.id}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border-2 border-gray-200 shadow-medium">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 bg-gradient-to-br ${deliveryConfig.color} rounded-xl flex items-center justify-center shadow-md text-2xl`}>
                  {deliveryConfig.icon}
                </div>
                <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Order ID</p>
                  <p className="text-base font-bold text-gray-900">#{order.id}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Delivery Type</p>
                  <p className="text-base font-bold text-gray-900">{deliveryConfig.label}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Date & Time</p>
                  <p className="text-base font-bold text-gray-900">{formatDateTime(order.datetime)}</p>
                </div>
                {order.notes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-base font-bold text-gray-900">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t-2 border-gray-100">
            <Button onClick={handleEdit} variant="outline" className="flex-1" size="lg">
              ✏️ Edit Order
            </Button>
            <Button onClick={handleSignOut} variant="secondary" className="flex-1" size="lg">
              🚪 Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
