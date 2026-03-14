import { charityClient } from "./charityClient";

// Create multiple challans for different months linked to a single proof
export const bulkCreateChallans = async (bulkChallanData) => {
  return await charityClient.challans.bulkCreate(bulkChallanData);
};

// Get all pending bulk challan operations (Admin only)
export const getPendingBulkOperations = async (days = 7, sortBy = "created_at", order = "desc") => {
  return await charityClient.bulkOperations.listPending({ days, sort_by: sortBy, order });
};

// Get detailed information about a specific bulk operation (Admin only)
export const getBulkChallanDetails = async (bulkGroupId) => {
  return await charityClient.bulkOperations.get(bulkGroupId);
};

// Approve all challans in a bulk group (Admin only)
export const approveBulkChallans = async (bulkGroupId, approveData) => {
  return await charityClient.bulkOperations.approve(bulkGroupId, approveData);
};

// Reject all challans in a bulk group (Admin only)
export const rejectBulkChallans = async (bulkGroupId, rejectData) => {
  return await charityClient.bulkOperations.reject(bulkGroupId, rejectData);
};