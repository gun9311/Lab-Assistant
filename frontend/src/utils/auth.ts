export const setUserId = (userId: string): void => {
  localStorage.setItem('userId', userId);
};

export const getUserId = (): string | null => {
  return localStorage.getItem('userId');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setRefreshToken = (refreshToken: string): void => {
  localStorage.setItem('refreshToken', refreshToken);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const setRole = (role: string): void => {
  localStorage.setItem('role', role);
};

export const getRole = (): string | null => {
  return localStorage.getItem('role');
};

export const setSchoolName = (school: string): void => {
  localStorage.setItem('school', school);
};

export const getSchoolName = (): string | null => {
  return localStorage.getItem('school');
};

export const setGradeStatus = (grade: string): void => {
  localStorage.setItem('grade', grade);
};

export const getGradeStatus = (): string | null => {
  return localStorage.getItem('grade');
};

export const clearAuth = (): void => {
  localStorage.removeItem('userId');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('role');
  localStorage.removeItem('school');
  localStorage.removeItem('grade');
};