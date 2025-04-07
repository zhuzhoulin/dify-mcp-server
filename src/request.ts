import JSONbig from 'json-bigint';
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const JSONbigString = JSONbig({ storeAsString: true });

// 定义 ErrorResponse 接口
export interface ErrorResponse {
    success: boolean;
    status_code: number;
    status_message: string;
    error?: {
        details?: any;
    };
    data?: any;
}

// 创建 axios 实例
const requestClient = axios.create({
    baseURL: process?.env?.BASE_URL,
    timeout: process?.env?.TIMEOUT ? Number(process?.env?.TIMEOUT) : 60000, // 默认超时时间 60s
    withCredentials: true,
    transformResponse: function (data, header) {
      if (this.responseType === 'arraybuffer') {
        return data;
      } else {
        return JSONbigString.parse(data);
      }
    }
});

// eslint-disable-next-line
// @ts-ignore
// axios的retry ts类型有问题
requestClient.interceptors.retry = 3;

// 请求拦截器
requestClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 可以在这里添加通用的请求头
        return config;
    },
    (error) => {
        return Promise.reject({
            success: false,
            error: {
                code: 'REQUEST_ERROR',
                message: 'Error in request',
                details: error,
            },
        });
    }
);

// 响应拦截器
requestClient.interceptors.response.use(
    (response: AxiosResponse) => {
        return response.data; // 返回数据部分
    },
    err => {
        const { config } = err;
        if (!config || !config.retry) return Promise.reject(err);
        config.retryCount = config.retryCount || 0;
        if (config.retryCount >= config.retry) {
          return Promise.reject(err);
        }
        config.retryCount += 1;
        return requestClient(config);
      }
);

export const getRequestClient = () => {
    return requestClient;
};
