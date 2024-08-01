import axios from 'axios';

const apiNoAuth = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

export default apiNoAuth;
