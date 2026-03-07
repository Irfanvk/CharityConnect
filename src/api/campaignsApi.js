import { charityClient } from "./charityClient";

// Create a new campaign (Admin only)
export const createCampaign = async (campaignData) => {
  return await charityClient.campaigns.create(campaignData);
};

// Get all campaigns with optional pagination and filtering
export const getAllCampaigns = async (skip = 0, limit = 100, activeOnly = false) => {
  return await charityClient.campaigns.getAll({ skip, limit, active_only: activeOnly });
};

// Get campaign by ID
export const getCampaignById = async (campaignId) => {
  return await charityClient.campaigns.getById(campaignId);
};

// Update a campaign (Admin only) - uses PATCH
export const updateCampaign = async (campaignId, updateData) => {
  return await charityClient.campaigns.update(campaignId, updateData);
};

// Delete a campaign (Admin only)
export const deleteCampaign = async (campaignId) => {
  return await charityClient.campaigns.delete(campaignId);
};