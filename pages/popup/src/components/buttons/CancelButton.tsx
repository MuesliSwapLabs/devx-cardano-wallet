import React from 'react';
import clsx from 'clsx';

interface CancelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const CancelButton: React.FC<CancelButtonProps> = ({ children = 'Cancel', className, ...props }) => {
  return (
    <button
      {...props}
      className={clsx('bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition', className)}>
      {children}
    </button>
  );
};

export default CancelButton;
