import React from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';

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
  <Box 
    component="form" 
    onSubmit={handleSubmit} 
    sx={{ 
      mt: 2, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2, 
      maxWidth: '400px', 
      mx: 'auto' // 중앙 정렬 
    }}
  >
    {fields.map((field) => (
      <TextField
        key={field.name}
        label={field.label}
        name={field.name}
        type={field.name === 'password' ? 'password' : 'text'}
        value={form[field.name]}
        onChange={handleChange}
        required={field.required}
        variant="outlined"
        fullWidth
      />
    ))}
    <Button type="submit" variant="contained" color="primary">
      Register
    </Button>
    {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
  </Box>
);

export default RegisterForm;
