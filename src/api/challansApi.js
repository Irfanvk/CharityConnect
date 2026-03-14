import { charityClient } from "./charityClient";

// Create a new challan (Member: self only, Admin: any member)
export const createChallan = async (challanData) => {
  return await charityClient.challans.create(challanData);
};

// Upload payment proof for a challan
export const uploadPaymentProof = async (challanId, file) => {
  return await charityClient.challans.uploadProof(challanId, file);
};

// Get all challans with optional filters (Admin only)
export const getAllChallans = async (skip = 0, limit = 100, statusFilter = null) => {
  const query = { skip, limit };
  if (statusFilter) {
    query.status = statusFilter;
  }
  return await charityClient.challans.list(query);
};

// Get challans for a specific member (Admin or self)
export const getMemberChallans = async (memberId, skip = 0, limit = 100) => {
  return await charityClient.challans.getByMember(memberId, { skip, limit });
};

// Get single challan by ID (Admin or owner)
export const getChallanById = async (challanId) => {
  return await charityClient.challans.get(challanId);
};

// Approve a challan (Admin only)
export const approveChallan = async (challanId, approveData) => {
  return await charityClient.challans.approve(challanId, approveData);
};

// Reject a challan (Admin only)
export const rejectChallan = async (challanId, rejectData) => {
  return await charityClient.challans.reject(challanId, rejectData);
};