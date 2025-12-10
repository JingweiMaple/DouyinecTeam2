import axios from 'axios';
import proxy from '../configs/host';

const env = import.meta.env.MODE || 'development';

// ⭐ 开发环境直接打到后端 3001，其它环境沿用原来的 proxy 配置
let API_HOST: string;

if (env === 'development') {
  // 后端 Node 服务地址
  API_HOST = 'http://localhost:3001';
} else {
  API_HOST = proxy[env]?.API || '';
}

const SUCCESS_CODE = 0;
const TIMEOUT = 5000;

export const instance = axios.create({
  baseURL: API_HOST, // ⭐ 关键：所有 /api/... 都会发到 http://localhost:3001
  timeout: TIMEOUT,
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => {
    /**
     * 后端统一返回格式：
     * { code: number; message: string; data: any }
     */
    const payload = response.data;

    // 正常：code === 0
    if (payload && payload.code === SUCCESS_CODE) {
      // ⭐ 直接返回 payload 本身：{ code, message, data }
      return payload;
    }

    // 非 0 当成业务错误，丢到 catch
    return Promise.reject(payload);
  },
  (e) => Promise.reject(e),
);

export default instance;
