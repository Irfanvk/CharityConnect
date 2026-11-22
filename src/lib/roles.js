// Roles: superadmin > admin > executive > member.
// Executives see every report, member and payment and help members (create payments, upload
// proof, record cash, send reminders) but never approve, reject or edit. The server enforces
// this too; these helpers only decide what to show.

const role = (userOrRole) => String((userOrRole && typeof userOrRole === "object" ? userOrRole.role : userOrRole) || "").toLowerCase();

export const isSuperadminRole = (u) => role(u) === "superadmin";
export const isAdminRole = (u) => ["admin", "superadmin"].includes(role(u));
export const isExecutiveRole = (u) => role(u) === "executive";
/** Admin, superadmin or executive: may see everyone's data. */
export const isStaffRole = (u) => ["admin", "superadmin", "executive"].includes(role(u));

export function roleLabel(u) {
  return { superadmin: "Superadmin", admin: "Admin", executive: "Executive", member: "Member" }[role(u)] || "Member";
}
