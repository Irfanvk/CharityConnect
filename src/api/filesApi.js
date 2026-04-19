import { charityClient } from "./charityClient";

// Upload a general file (proof, document) and get back its public URL (jpg, png, pdf — max 3MB)
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return await charityClient.files.upload(formData);
};

// Upload an avatar/profile image to Cloudinary via the dedicated avatar endpoint (jpg, png — max 3MB)
export const uploadAvatar = async (file) => {
  return await charityClient.files.uploadAvatar(file);
};

// Delete a previously uploaded Cloudinary file by its URL
export const deleteFile = async (fileUrl) => {
  return await charityClient.files.deleteFile(fileUrl);
};