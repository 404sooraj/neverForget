import { API_URL } from "../config";

export const api = {
  // Example API call
  async fetchData() {
    try {
      const response = await fetch(`${API_URL}/api/endpoint`);
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  // Add more API methods as needed
};

export default api;
