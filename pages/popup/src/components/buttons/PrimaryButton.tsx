import React from 'react';
import clsx from 'clsx';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ children = 'Create New Wallet', className, ...props }) => {
  return (
    <button
      {...props}
      className={clsx('bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition', className)}>
      {children}
    </button>
  );
};

export default PrimaryButton;
