// ─────────────────────────────────────────────────────────────────────────────
// LOCKED: the organisation's official bank details and UPI QR.
//
// These live in the app code on purpose. They are never read from the database,
// the API or the Superadmin Panel, so nobody can change them from inside the
// app, even with a stolen admin password or database access. The only way to
// change them is a code update through GitHub:
//   1. edit the values below (and UPI_QR_ROWS if the UPI ID or name changes),
//   2. run  node scripts/bank-details-seal.mjs  and paste the new seal,
//   3. open a pull request. "npm run build" fails if the seal does not match.
// ─────────────────────────────────────────────────────────────────────────────
import { sha256Hex } from "../lib/sha256.js";

export const BANK_DETAILS = Object.freeze({
  organisation: "Poyyathabail Jama'ath GCC Committee",
  bankName: "Kerala Gramin Bank",
  branch: "Kodlamogaru",
  accountName: "Poyyath Vayal Jamaath Committee",
  ifsc: "KLGB0040483",
  accountNumber: "40483111000177",
  upiId: "8089076603@cnrb",
});

// What the QR contains. No amount: the member types it in their UPI app.
export const UPI_PAY_URI =
  `upi://pay?pa=${BANK_DETAILS.upiId}&pn=${encodeURIComponent(BANK_DETAILS.accountName)}&cu=INR`;

// The QR picture for UPI_PAY_URI, one hex string per row (1 bit = 1 square).
export const UPI_QR_SIZE = 41;
export const UPI_QR_ROWS = Object.freeze([
  "1fc80f7bd7f", "105fa444a41", "174bbd3445d", "17589e9015d", "175dade215d",
  "104f0fb2d41", "1fd5555557f", "0018e24f000", "0bdbecd2fda", "05970a952cd",
  "1473f95b00e", "0d37269c41a", "125d42dc323", "1c33c5196ad", "14676916f07",
  "1ab9c0962be", "15c53167cae", "1e8e18e4d31", "0ed0d179361", "029bf1b75cf",
  "0b435a5a2fb", "1a29159aa2e", "0963a75c124", "01236486a13", "19eee2763d0",
  "0f3acdae09d", "00fc7e76e4b", "0f85cdb593e", "04e99bb79c2", "1481d1979fb",
  "1b6fe363a2d", "1e30e4cbcfd", "1b63e19effb", "001cfb5551d", "1fc98fd255c",
  "105195caf1b", "1750cb731fa", "17531b846a4", "17475c4a41f", "1053da6c4f9",
  "1fcef6ba1e8",
]);

// SHA-256 over everything above. A changed digit without a new seal hides the
// details and shows a warning instead of showing a wrong account.
export const BANK_DETAILS_SEAL = "7d98da2cda2f8eaac1002d1595021f2add3464bea8532a99ff95cfbfa70e1a36";

export function bankDetailsFingerprint() {
  return sha256Hex(JSON.stringify([
    BANK_DETAILS.organisation, BANK_DETAILS.bankName, BANK_DETAILS.branch, BANK_DETAILS.accountName,
    BANK_DETAILS.ifsc, BANK_DETAILS.accountNumber, BANK_DETAILS.upiId,
    UPI_PAY_URI, UPI_QR_SIZE, UPI_QR_ROWS.join(""),
  ]));
}

export const bankDetailsVerified = () => bankDetailsFingerprint() === BANK_DETAILS_SEAL;

// "4048 3111 0001 77": groups of four are easier to read and to type.
export const formatAccountNumber = (value) => String(value).replace(/(.{4})(?=.)/g, "$1 ");

// SVG path for the QR: one rectangle per run of dark squares.
export function upiQrPath() {
  let path = "";
  UPI_QR_ROWS.forEach((row, y) => {
    const bits = BigInt(`0x${row}`).toString(2).padStart(UPI_QR_SIZE, "0");
    for (let x = 0; x < UPI_QR_SIZE; x++) {
      if (bits[x] !== "1") continue;
      let run = 1;
      while (x + run < UPI_QR_SIZE && bits[x + run] === "1") run++;
      path += `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  });
  return path;
}
