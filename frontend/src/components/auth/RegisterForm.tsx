import React from 'react';

interface RegisterFormProps {
  form: { [key: string]: string };
  error: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  fields: { name: string; label: string; required: boolean }[];
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  form,
  error,
  handleChange,
  handleSubmit,
  fields,
}) => (
  <div>
    <form onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div key={field.name}>
          <label>
            {field.label} {field.required && '*'}
            <input
              type={field.name === 'password' ? 'password' : 'text'}
              name={field.name}
              placeholder={field.label}
              value={form[field.name]}
              onChange={handleChange}
              required={field.required}
            />
          </label>
        </div>
      ))}
      <button type="submit">Register</button>
      {error && <p>{error}</p>}
    </form>
  </div>
);

export default RegisterForm;