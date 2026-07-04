import { charityClient } from "./charityClient";

// Login user
export const loginUser = async (credentials) => {
  return await charityClient.auth.login(credentials);
};

// Register user with invite
export const registerUser = async (data) => {
  return await charityClient.auth.register(data);
};

// Get current authenticated user
export const getCurrentUser = async () => {
  return await charityClient.auth.me();
};

// Logout user
export const logoutUser = async () => {
  return await charityClient.auth.logout();
};

// Change password for authenticated user
export const changePassword = async (currentPassword, newPassword) => {
  return await charityClient.auth.changePassword(currentPassword, newPassword);
};