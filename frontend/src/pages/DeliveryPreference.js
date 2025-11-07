import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api';

const DeliveryPreference = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliveryType, setDeliveryType] = useState('');
  const [address, setAddress] = useState('');
  const [datetime, setDatetime] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [notesState, setNotesState] = useState('idle');

  useEffect(() => {
    const saved = localStorage.getItem('deliveryForm');
    if (saved) {
      const formData = JSON.parse(saved);
      setDeliveryType(formData.deliveryType || '');
      setAddress(formData.address || '');
      setDatetime(formData.datetime || '');
      setNotes(formData.notes || '');
    }
  }, []);

  useEffect(() => {
    const formData = {
      deliveryType,
      address,
      datetime,
      notes,
    };
    localStorage.setItem('deliveryForm', JSON.stringify(formData));
  }, [deliveryType, address, datetime, notes]);

  const validate = () => {
    const newErrors = {};

    if (!deliveryType) {
      newErrors.deliveryType = 'Delivery type is required';
    }

    if (deliveryType === 'DELIVERY' && !address.trim()) {
      newErrors.address = 'Address is required for delivery';
    }

    if (!datetime) {
      newErrors.datetime = 'Date and time is required';
    } else {
      const selectedDate = new Date(datetime);
      const now = new Date();
      if (selectedDate <= now) {
        newErrors.datetime = 'Date and time must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSuggestTime = async () => {
    if (!deliveryType) {
      setErrors({ deliveryType: 'Please select a delivery type first' });
      return;
    }

    setSuggesting(true);
    try {
      const response = await api.post('/ai/suggest-time', {
        delivery_type: deliveryType,
      });
      const suggestedDate = new Date(response.suggested_time);
      if (suggestedDate <= new Date()) {
        suggestedDate.setHours(suggestedDate.getHours() + 2);
      }
      const isoString = suggestedDate.toISOString().slice(0, 16);
      setDatetime(isoString);
      setErrors({ ...errors, datetime: '' });
    } catch (error) {
      console.error('Failed to get suggestion:', error);
    } finally {
      setSuggesting(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (!deliveryType) {
      setErrors({ deliveryType: 'Please select a delivery type first' });
      return;
    }

    if (!datetime) {
      setErrors({ datetime: 'Please select a date and time first' });
      return;
    }

    setGeneratingNotes(true);
    setNotesState('thinking');

    try {
      const requestData = {
        delivery_type: deliveryType,
        datetime: new Date(datetime).toISOString(),
      };

      if (deliveryType === 'DELIVERY' && address) {
        requestData.address = address;
      }

      setTimeout(() => {
        setNotesState('generating');
      }, 500);

      const response = await api.post('/ai/generate-notes', requestData);
      
      setNotes(response.notes);
      setNotesState('idle');
    } catch (error) {
      console.error('Failed to generate notes:', error);
      setNotesState('idle');
    } finally {
      setGeneratingNotes(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        type: deliveryType,
        datetime: new Date(datetime).toISOString(),
        notes: notes || undefined,
      };

      const order = await api.post('/orders', orderData);
      localStorage.removeItem('deliveryForm');
      navigate(`/summary?orderId=${order.id}`);
    } catch (error) {
      setErrors({
        form: error.response?.data?.error || 'Failed to create order',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDatetime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  const deliveryTypeOptions = [
    { value: 'IN_STORE', label: 'In Store Pickup', icon: '🏪', color: 'from-blue-500 to-blue-600' },
    { value: 'DELIVERY', label: 'Home Delivery', icon: '🚚', color: 'from-primary-500 to-primary-600' },
    { value: 'CURBSIDE', label: 'Curbside Pickup', icon: '🚗', color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="w-full max-w-3xl animate-scaleIn">
        <div className="card card-hover">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-glow mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Delivery Preference</h1>
            <p className="text-gray-600">
              Welcome back, <span className="font-semibold text-primary-700">{user?.email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.form && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium shadow-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.form}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Delivery Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {deliveryTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setDeliveryType(option.value);
                      setErrors({ ...errors, deliveryType: '' });
                    }}
                    className={`
                      p-6 rounded-2xl border-2 transition-all duration-300 text-left
                      transform hover:scale-105
                      ${deliveryType === option.value
                        ? `border-primary-500 bg-gradient-to-br ${option.color} text-white shadow-glow`
                        : 'border-gray-200 hover:border-primary-300 hover:shadow-medium bg-white'
                      }
                    `}
                  >
                    <div className="text-3xl mb-3">{option.icon}</div>
                    <div className={`font-bold ${deliveryType === option.value ? 'text-white' : 'text-gray-900'}`}>
                      {option.label}
                    </div>
                  </button>
                ))}
              </div>
              {errors.deliveryType && (
                <p className="mt-2 text-sm text-red-600 font-medium">{errors.deliveryType}</p>
              )}
            </div>

            {deliveryType === 'DELIVERY' && (
              <div className="animate-fadeIn">
                <Input
                  label="Delivery Address"
                  type="text"
                  name="address"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setErrors({ ...errors, address: '' });
                  }}
                  error={errors.address}
                  placeholder="Enter your delivery address"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="datetime-local"
                  value={datetime}
                  onChange={(e) => {
                    setDatetime(e.target.value);
                    setErrors({ ...errors, datetime: '' });
                  }}
                  min={getMinDatetime()}
                  className={`
                    flex-1 px-4 py-3 border-2 rounded-xl shadow-sm transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                    ${errors.datetime ? 'border-red-400 focus:ring-red-500 bg-red-50' : 'border-gray-200 hover:border-primary-300'}
                  `}
                />
                <Button
                  type="button"
                  onClick={handleSuggestTime}
                  disabled={suggesting || !deliveryType}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {suggesting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Suggesting...
                    </span>
                  ) : (
                    '✨ Suggest Time'
                  )}
                </Button>
              </div>
              {errors.datetime && (
                <p className="mt-2 text-sm text-red-600 font-medium">{errors.datetime}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Notes (Optional)
                </label>
                <Button
                  type="button"
                  onClick={handleGenerateNotes}
                  disabled={generatingNotes || !deliveryType || !datetime}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {generatingNotes ? (
                    <span className="flex items-center">
                      {notesState === 'thinking' ? (
                        <>
                          <svg className="animate-pulse -ml-1 mr-2 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Thinking...
                        </>
                      ) : (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      )}
                    </span>
                  ) : (
                    '🤖 AI Generate Notes'
                  )}
                </Button>
              </div>
              <textarea
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional instructions or special requests"
                rows={3}
                className={`
                  w-full px-4 py-3 border-2 rounded-xl shadow-sm transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  border-gray-200 hover:border-primary-300 resize-none
                `}
              />
              {generatingNotes && notesState !== 'idle' && (
                <div className="mt-2 flex items-center gap-2 text-sm text-primary-600">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="font-medium">
                    {notesState === 'thinking' ? 'AI is thinking...' : 'AI is generating your notes...'}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Order...
                  </span>
                ) : (
                  'Create Order'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPreference;
