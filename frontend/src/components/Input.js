import React from 'react';

const Input = ({ label, type = 'text', value, onChange, error, className = '', ...props }) => {
  return (
    <div className="mb-6">
      {label && (
        <label htmlFor={props.id || props.name} className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={`
          w-full px-4 py-3 border-2 rounded-xl shadow-sm transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${error 
            ? 'border-red-400 focus:ring-red-500 bg-red-50' 
            : 'border-gray-200 hover:border-primary-300 focus:bg-white'
          }
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
