import { charityClient } from "./charityClient";

// Get all members (Admin only)
export const getAllMembers = async (skip = 0, limit = 100) => {
  return await charityClient.members.getAll({ skip, limit });
};

// Get current user's member profile
export const getMyProfile = async () => {
  return await charityClient.members.getMe();
};

// Get member by member code (Admin only)
export const getMemberByCode = async (memberCode) => {
  return await charityClient.members.getByCode(memberCode);
};

// Get member by ID
export const getMemberById = async (memberId) => {
  return await charityClient.members.getById(memberId);
};

// Update member information (Admin only)
export const updateMember = async (memberId, updateData) => {
  return await charityClient.members.update(memberId, updateData);
};