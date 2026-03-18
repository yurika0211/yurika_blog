import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "./apiConfig";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  [key: string]: unknown;
}

// 1. 创建一个 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 请求超时时间 (10秒)
  headers: {
    "Content-Type": "application/json",
  },
});

// 添加错误拦截器，用于调试
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error("API Error Details:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

// 2. 封装登录请求
export const loginApi = {
  login: async (payload: LoginRequest) => {
    const response = await apiClient.post<LoginResponse>("/login", payload);
    return response.data;
  },
};
