/**
 * Notification API Type Definitions
 * Maps to backend notification schemas and endpoints
 */

export type UserRole = 'member' | 'admin' | 'superadmin';
export type AudienceFilter = 'all' | 'members' | 'admins' | 'superadmins';
export type RecipientScope = 'all' | 'members' | 'admins' | 'superadmins';

/**
 * Notification creation payload
 * POST /notifications/
 */
export interface NotificationCreatePayload {
  title: string;
  message: string;
  user_id?: number;           // Send to specific user
  target_role?: UserRole;     // Broadcast to role (member, admin, superadmin)
}

/**
 * Notification response object
 */
export interface NotificationResponse {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;         // ISO 8601 datetime
  read_at: string | null;     // ISO 8601 datetime
}

/**
 * Notification creation response
 */
export interface NotificationCreateResponse {
  sent_count: number;
  message: string;
}

/**
 * Query parameters for listing user's notifications
 * GET /notifications/
 */
export interface NotificationListParams {
  skip?: number;              // Pagination offset (default: 0)
  limit?: number;             // Max records (default: 50)
}

/**
 * Unread count response
 * GET /notifications/unread/count
 */
export interface UnreadCountResponse {
  unread_count: number;
}

/**
 * Mark all read response
 * POST /notifications/mark-all-read
 */
export interface MarkAllReadResponse {
  marked_read: number;
  message: string;
}

/**
 * Sent batch response (Admin only)
 * GET /notifications/admin/sent
 */
export interface NotificationSentBatchResponse {
  batch_created_at: string;   // ISO 8601 datetime
  title: string;
  message: string;
  total_sent: number;
  recipient_counts: {
    members: number;
    admins: number;
    superadmins: number;
  };
  audience_label: string;     // e.g., "members-only", "admins-only", "all", "mixed"
  created_by_user_id: number;
  created_by_email: string;
}

/**
 * Query parameters for listing sent batches (Admin only)
 * GET /notifications/admin/sent
 */
export interface NotificationSentBatchListParams {
  minutes?: number;           // Time window in minutes (default: 10080 = 7 days)
  audience_filter?: AudienceFilter;  // Filter by audience
  skip?: number;              // Pagination offset (default: 0)
  limit?: number;             // Max records (default: 50)
}

/**
 * Delete sent batch payload (Admin only)
 * DELETE /notifications/admin/sent
 */
export interface NotificationSentDeleteRequest {
  batch_created_at: string;   // ISO 8601 datetime (exact match)
  title: string;              // Exact match
  message: string;            // Exact match
  recipient_scope: RecipientScope;  // Filter by recipient type
}

/**
 * Delete sent batch response
 */
export interface NotificationSentDeleteResponse {
  deleted_count: number;
  message: string;
}

/**
 * Notification admin update payload
 * PUT /notifications/{notification_id}
 */
export interface NotificationAdminUpdate {
  title?: string;
  message?: string;
  is_read?: boolean;
}

/**
 * Notification API client interface
 * Matches charityClient.notifications
 */
export interface NotificationAPI {
  /**
   * Create and send notification (Admin only)
   * Supports: single user (user_id), role broadcast (target_role), or all users
   */
  create(payload: NotificationCreatePayload): Promise<NotificationCreateResponse>;

  /**
   * Get current user's notifications with pagination
   */
  listMine(params?: NotificationListParams): Promise<NotificationResponse[]>;

  /**
   * Get unread notifications count for current user
   */
  unreadCount(): Promise<number>;

  /**
   * Mark a notification as read
   */
  markRead(notificationId: number): Promise<NotificationResponse>;

  /**
   * Mark all notifications as read for current user
   */
  markAllRead(): Promise<MarkAllReadResponse>;

  /**
   * List sent notification batches (Admin only)
   * Groups notifications by creation time, title, and message
   * Shows recipient breakdown by role
   */
  listSentBatches(params?: NotificationSentBatchListParams): Promise<NotificationSentBatchResponse[]>;

  /**
   * Delete a sent notification batch (Admin only)
   * Removes all notifications matching the batch criteria and recipient scope
   */
  deleteSentBatch(payload: NotificationSentDeleteRequest): Promise<NotificationSentDeleteResponse>;

  // Legacy methods (backward compatibility)
  list(query?: Record<string, any>): Promise<NotificationResponse[]>;
  get(id: number): Promise<NotificationResponse>;
  send(data: any): Promise<any>;
  update(id: number, data: NotificationAdminUpdate): Promise<any>;
  delete(id: number): Promise<void>;
  markAsRead(id: number): Promise<any>;
  markAllAsRead(): Promise<any>;
  subscribe(callback: (notification: NotificationResponse) => void): () => void;
}

/**
 * Example usage:
 * 
 * // Create notification for specific user
 * await charityClient.notifications.create({
 *   title: "Payment Approved",
 *   message: "Your March 2026 payment has been approved.",
 *   user_id: 5
 * });
 * 
 * // Broadcast to all members
 * await charityClient.notifications.create({
 *   title: "Monthly Reminder",
 *   message: "Please submit your monthly donation.",
 *   target_role: "member"
 * });
 * 
 * // Get my notifications
 * const notifications = await charityClient.notifications.listMine({
 *   skip: 0,
 *   limit: 20
 * });
 * 
 * // Get unread count
 * const unreadCount = await charityClient.notifications.unreadCount();
 * 
 * // Mark as read
 * await charityClient.notifications.markRead(25);
 * 
 * // Admin: List sent batches
 * const sentBatches = await charityClient.notifications.listSentBatches({
 *   minutes: 1440,  // Last 24 hours
 *   audience_filter: 'members'
 * });
 * 
 * // Admin: Delete sent batch
 * await charityClient.notifications.deleteSentBatch({
 *   batch_created_at: "2026-03-07T10:00:00",
 *   title: "Test Notification",
 *   message: "This is a test",
 *   recipient_scope: 'all'
 * });
 */
