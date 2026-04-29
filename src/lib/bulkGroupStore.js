/**
 * bulkGroupStore.js
 *
 * Shared localStorage store for bulk challan group metadata.
 *
 * WHY THIS EXISTS:
 * The backend /challans/ list endpoint does NOT include bulk_group_id on
 * individual challan rows. We persist the mapping client-side so:
 *   - Challans.jsx can group rows into a single "Bulk Monthly" entry
 *   - BulkOperationsPanel can show all bulk groups, not just the last 7 days
 *     (API default) or groups from a single browser session
 */

const BULK_GROUPS_KEY = 'charityconnect_bulk_groups';

/**
 * Saves / updates a bulk group entry in localStorage.
 * Safe to call with any partial backend response — missing fields are ignored.
 */
export function saveBulkGroup(bulkData) {
    if (!bulkData?.bulk_group_id) return;
    try {
        const existing = JSON.parse(localStorage.getItem(BULK_GROUPS_KEY) || '[]');
        const idx = existing.findIndex(
            (g) => g.bulk_group_id === bulkData.bulk_group_id
        );
        const entry = {
            bulk_group_id: String(bulkData.bulk_group_id),
            challan_ids: (bulkData.challan_ids || []).map(Number),
            member_id: bulkData.member_id,
            months: Array.isArray(bulkData.months) ? bulkData.months : [],
            months_count: bulkData.months_count || (Array.isArray(bulkData.months) ? bulkData.months.length : 0),
            total_amount: Number(bulkData.total_amount || 0),
            proof_url:
                bulkData.proof_url ||
                bulkData.proof_path ||
                (typeof bulkData.proof_file_id === 'string' &&
                    (bulkData.proof_file_id.startsWith('http://') ||
                        bulkData.proof_file_id.startsWith('https://'))
                    ? bulkData.proof_file_id
                    : null),
            created_at: bulkData.created_at || new Date().toISOString(),
            // Normalise status — backend returns "pending_approval", panel needs "pending"
            status: bulkData.status || 'pending_approval',
            member_name: bulkData.member_name || null,
            member_email: bulkData.member_email || null,
        };
        if (idx >= 0) {
            existing[idx] = entry;
        } else {
            existing.push(entry);
        }
        localStorage.setItem(BULK_GROUPS_KEY, JSON.stringify(existing));
    } catch {
        // Storage unavailable — silently ignore.
    }
}

/**
 * Returns all bulk group entries from localStorage.
 * Always returns an array (never throws).
 */
export function loadBulkGroups() {
    try {
        const raw = localStorage.getItem(BULK_GROUPS_KEY);
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Updates the status of a stored bulk group entry.
 * Called after approve/reject so the UI reflects the new state immediately.
 */
export function updateBulkGroupStatus(bulkGroupId, newStatus) {
    if (!bulkGroupId) return;
    try {
        const existing = loadBulkGroups();
        const idx = existing.findIndex((g) => g.bulk_group_id === String(bulkGroupId));
        if (idx >= 0) {
            existing[idx] = { ...existing[idx], status: newStatus };
            localStorage.setItem(BULK_GROUPS_KEY, JSON.stringify(existing));
        }
    } catch {
        // Ignore.
    }
}
