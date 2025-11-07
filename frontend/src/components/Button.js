import React from 'react';

const Button = ({ children, type = 'button', disabled, onClick, className = '', variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = `
    font-semibold rounded-xl transition-all duration-300
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none
    active:scale-95
  `;

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-primary-600 to-primary-700 text-white
      hover:from-primary-700 hover:to-primary-800
      focus:ring-primary-500 shadow-md hover:shadow-glow
      hover:scale-105
    `,
    secondary: `
      bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800
      hover:from-gray-200 hover:to-gray-300
      focus:ring-gray-400 shadow-sm hover:shadow-md
      hover:scale-105
    `,
    outline: `
      border-2 border-primary-600 text-primary-700 bg-white
      hover:bg-primary-50 hover:border-primary-700
      focus:ring-primary-500 shadow-sm hover:shadow-md
      hover:scale-105
    `,
    success: `
      bg-gradient-to-r from-green-500 to-green-600 text-white
      hover:from-green-600 hover:to-green-700
      focus:ring-green-500 shadow-md hover:shadow-glow
      hover:scale-105
    `,
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
