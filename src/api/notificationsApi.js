import { charityClient } from "./charityClient";

// Create and send a notification (Admin only)
export const createNotification = async (notificationData) => {
  return await charityClient.notifications.create(notificationData);
};

// Get current user's notifications
export const getMyNotifications = async (skip = 0, limit = 50) => {
  return await charityClient.notifications.listMine({ skip, limit });
};

export const getNotificationFeed = async (skip = 0, limit = 50) => {
  return await charityClient.notifications.feed({ skip, limit });
};

// Get unread notifications count for current user
export const getUnreadCount = async () => {
  return await charityClient.notifications.unreadCount();
};

// Get a single notification by ID
export const getNotificationById = async (notificationId) => {
  return await charityClient.notifications.get(notificationId);
};

// Mark a specific notification as read
export const markAsRead = async (notificationId) => {
  return await charityClient.notifications.markAsRead(notificationId);
};

// Mark all notifications as read for current user
export const markAllAsRead = async () => {
  return await charityClient.notifications.patchRead({ mark_all: true });
};

export const markSelectedAsRead = async (notificationIds = []) => {
  return await charityClient.notifications.patchRead({
    mark_all: false,
    notification_ids: notificationIds,
  });
};

// Update notification details (Admin only)
export const updateNotification = async (notificationId, updateData) => {
  return await charityClient.notifications.update(notificationId, updateData);
};

// Delete a notification (Admin only)
export const deleteNotification = async (notificationId) => {
  return await charityClient.notifications.delete(notificationId);
};