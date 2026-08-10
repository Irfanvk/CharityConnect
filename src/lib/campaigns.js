import { differenceInDays, format } from "@/lib/dateTime";

export function getCampaignTargetMode(campaign) {
  if (!campaign || typeof campaign !== "object") return "targeted";
  if (
    campaign.target_mode === "unlimited" ||
    campaign.goal_type === "unlimited" ||
    campaign.is_unlimited_target === true
  ) {
    return "unlimited";
  }
  if (
    campaign.target_mode === "targeted" ||
    campaign.goal_type === "targeted" ||
    campaign.is_unlimited_target === false
  ) {
    return "targeted";
  }
  return campaign.target_amount === null || campaign.target_amount === undefined || campaign.target_amount === ""
    ? "unlimited"
    : "targeted";
}

export function getCampaignEndDateMode(campaign) {
  if (!campaign || typeof campaign !== "object") return "fixed";
  if (
    campaign.end_date_mode === "open" ||
    campaign.timeline_type === "open" ||
    campaign.has_end_date === false
  ) {
    return "open";
  }
  if (
    campaign.end_date_mode === "fixed" ||
    campaign.timeline_type === "fixed" ||
    campaign.has_end_date === true
  ) {
    return "fixed";
  }
  return campaign.end_date ? "fixed" : "open";
}

export function isUnlimitedTarget(campaign) {
  return getCampaignTargetMode(campaign) === "unlimited";
}

export function hasOpenEndedDate(campaign) {
  return getCampaignEndDateMode(campaign) === "open";
}

export function getCampaignTargetAmount(campaign) {
  if (isUnlimitedTarget(campaign)) return 0;
  return Number(campaign?.target_amount || 0);
}

export function getCampaignProgress(campaign) {
  if (isUnlimitedTarget(campaign)) return null;
  const targetAmount = getCampaignTargetAmount(campaign);
  const collectedAmount = Number(campaign?.collected_amount || 0);
  if (targetAmount <= 0) return 0;
  return Math.min((collectedAmount / targetAmount) * 100, 100);
}

export function formatCampaignTargetText(campaign) {
  if (isUnlimitedTarget(campaign)) return "Unlimited";
  return `₹${getCampaignTargetAmount(campaign).toLocaleString("en-IN")}`;
}

export function getCampaignAbsoluteEndLabel(campaign) {
  if (hasOpenEndedDate(campaign) || !campaign?.end_date) {
    return "No end date";
  }

  const endDate = new Date(campaign.end_date);
  if (Number.isNaN(endDate.getTime())) {
    return "No end date";
  }

  return format(endDate, "MMM d, yyyy");
}

export function getCampaignRelativeEndLabel(campaign, now = new Date()) {
  if (hasOpenEndedDate(campaign) || !campaign?.end_date) {
    return "No end date";
  }

  const endDate = new Date(campaign.end_date);
  if (Number.isNaN(endDate.getTime())) {
    return "No end date";
  }

  const daysLeft = differenceInDays(endDate, now);
  return daysLeft > 0 ? `${daysLeft} days left` : "Ended";
}