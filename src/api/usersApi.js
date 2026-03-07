import { charityClient } from "./charityClient";

// Get all users with optional filtering (Admin only)
export const getAllUsers = async ({
  skip = 0,
  limit = 100,
  role = null,
  isActive = null,
  search = null,
} = {}) => {
  return await charityClient.users.getAll({
    skip,
    limit,
    role,
    is_active: isActive,
    search,
  });
};