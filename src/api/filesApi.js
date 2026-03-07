import { charityClient } from "./charityClient";

// Upload a file and get back its public URL (accepts jpg, png, pdf — max 3MB)
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return await charityClient.files.upload(formData);
};