import React from 'react';
import { Field } from 'formik';

interface FloatingLabelInputProps {
  name: string;
  label: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | false;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  name,
  label,
  type = 'text',
  disabled = false,
  required = false,
  error,
}) => {
  return (
    <div className="relative">
      <Field
        type={type}
        id={name}
        name={name}
        disabled={disabled}
        placeholder=" " // This space is crucial
        className={`
          block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border
          appearance-none dark:text-white 
          focus:outline-none focus:ring-0 peer
          
          /* --- Default & Error States --- */
          ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-600 dark:focus:border-blue-500'}

          /* --- Disabled State Styles for the Input --- */
          disabled:cursor-not-allowed
          disabled:border-gray-200 dark:disabled:border-gray-700
          disabled:bg-gray-100 dark:disabled:bg-gray-700
        `}
      />
      <label
        htmlFor={name}
        className={`
          absolute text-sm 
          
          /* --- Base position and animation properties --- */
          z-10 origin-[0] px-2
          top-2 start-2.5 /* Set a CONSTANT top position */
          cursor-text /* NEW: Default cursor to match text input */
          transform /* Add transform for GPU acceleration */
          transition-[color,transform] duration-300 ease-in-out

          /* --- FINAL (FLOATED) STATE --- */
          /* These are the base styles for the floated label */
          -translate-y-4 scale-75

          /* --- INITIAL (CENTERED) STATE --- */
          /* This overrides the transform when the placeholder is shown, moving the label down and scaling it up */
          peer-placeholder-shown:translate-y-1.5
          peer-placeholder-shown:scale-100
          
          /* Keep it floated when there is a value but not focused */
          peer-not-placeholder-shown:scale-75
          peer-not-placeholder-shown:-translate-y-4

          /* --- COLOR & BACKGROUND LOGIC --- */
          bg-slate-50 dark:bg-gray-800
          ${
            error
              ? 'text-red-500 dark:text-red-500'
              : 'text-gray-500 dark:text-gray-400 peer-focus:text-blue-600 peer-focus:dark:text-blue-500'
          }
          /* Override text color on focus, which has higher specificity */
          peer-focus:-translate-y-4 peer-focus:scale-75

          /* --- DISABLED STATE LOGIC --- */
          peer-disabled:cursor-not-allowed
          peer-disabled:text-gray-400 dark:peer-disabled:text-gray-500
          peer-disabled:bg-gray-100 dark:peer-disabled:bg-gray-700
        `}>
        {label}
        {required && <span className="text-inherit ms-1">*</span>}
      </label>
    </div>
  );
};

export default FloatingLabelInput;
