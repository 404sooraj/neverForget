import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://172.30.64.1:5000",
  timeout: 30000,
});

axiosInstance.interceptors.request.use(
  (req) => {
    console.log("[HTTP REQ]", req.method, req.url, req.headers, req.data);
    // optionally add tracing id, auth etc
    return req;
  },
  (err: any) => {
    console.error("[HTTP REQ ERR]", err);
    return Promise.reject(err);
  }
);

axiosInstance.interceptors.response.use(
  (res) => {
    console.log("[HTTP RES]", res.status, res.config.url, res);
    return res;
  },
  (err: any) => {
    console.error(
      "[HTTP RES ERR]",
      err?.response?.status,
      err?.response?.data || err
    );
    return Promise.reject(err);
  }
);

export default axiosInstance;
