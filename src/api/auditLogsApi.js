import { charityClient } from "./charityClient";

// Get audit logs with optional filtering (Admin only)
export const getAuditLogs = async ({
  skip = 0,
  limit = 100,
  userId = null,
  entityType = null,
  action = null,
} = {}) => {
  return await charityClient.auditLogs.getAll({
    skip,
    limit,
    user_id: userId,
    entity_type: entityType,
    action,
  });
};

// Create an audit log entry (Admin only)
export const createAuditLog = async (auditLogData) => {
  return await charityClient.auditLogs.create(auditLogData);
};