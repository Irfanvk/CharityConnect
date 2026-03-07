import { charityClient } from "./charityClient";

// Create a new invite code (Admin only)
export const createInvite = async (inviteData) => {
  return await charityClient.invites.create(inviteData);
};

// Get all invites with optional filters, sorting and pagination (Admin only)
export const getAllInvites = async ({
  skip = 0,
  limit = 100,
  isUsed = null,
  email = null,
  phone = null,
  sortBy = "created_at",
  sortOrder = "desc",
} = {}) => {
  return await charityClient.invites.getAll({
    skip,
    limit,
    is_used: isUsed,
    email,
    phone,
    sort_by: sortBy,
    sort_order: sortOrder,
  });
};

// Get all pending invite codes (Admin only)
export const getPendingInvites = async () => {
  return await charityClient.invites.getPending();
};

// Validate an invite code against email or phone
export const validateInvite = async (emailOrPhone, inviteCode) => {
  return await charityClient.invites.validate({
    email_or_phone: emailOrPhone,
    invite_code: inviteCode,
  });
};

// Get invite details by ID (Admin only)
export const getInviteById = async (inviteId) => {
  return await charityClient.invites.getById(inviteId);
};

// Update invite details (Admin only)
export const updateInvite = async (inviteId, updateData) => {
  return await charityClient.invites.update(inviteId, updateData);
};

// Delete an invite code (Admin only)
export const deleteInvite = async (inviteId) => {
  return await charityClient.invites.delete(inviteId);
};