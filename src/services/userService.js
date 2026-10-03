import api, { unwrap, unwrapMutation } from "@/services/apiService.js";

export const getUsers = async (params = {}) => {
  try {
    return unwrap(await api.get("/users", { params }), "Failed to fetch users");
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const getUser = async (id) => {
  try {
    return unwrap(await api.get(`/users/${id}`), "Failed to fetch user");
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const createUser = async (data) => {
  try {
    return unwrapMutation(await api.post("/users", data), "Failed to create user");
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (id, data) => {
  try {
    return unwrapMutation(await api.patch(`/users/${id}`, data), "Failed to update user");
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    return unwrapMutation(await api.delete(`/users/${id}`), "Failed to delete user");
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};
