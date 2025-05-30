import React from 'react';
import clsx from 'clsx';

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({ children = 'Spoof Wallet', className, ...props }) => {
  return (
    <button
      {...props}
      className={clsx(
        'bg-transparent border border-blue-600 py-2 px-4 rounded hover:bg-blue-700 hover:text-white transition',
        className,
      )}>
      {children}
    </button>
  );
};

export default SecondaryButton;
