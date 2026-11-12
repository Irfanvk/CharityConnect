// Seal for the locked bank details in src/config/bankDetails.js.
//   node scripts/bank-details-seal.mjs          print the seal for the current values
//   node scripts/bank-details-seal.mjs --check  fail (exit 1) if the stored seal is wrong; runs before every build
import {
  BANK_DETAILS, BANK_DETAILS_SEAL, UPI_PAY_URI, UPI_QR_ROWS, UPI_QR_SIZE, bankDetailsFingerprint,
} from "../src/config/bankDetails.js";

const fingerprint = bankDetailsFingerprint();
const problems = [];
if (UPI_QR_ROWS.length !== UPI_QR_SIZE) problems.push(`QR has ${UPI_QR_ROWS.length} rows, expected ${UPI_QR_SIZE}`);
if (!/^\d{9,18}$/.test(BANK_DETAILS.accountNumber)) problems.push("account number must be 9 to 18 digits");
if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(BANK_DETAILS.ifsc)) problems.push("IFSC does not look right");
if (!/^[\w.-]+@[a-zA-Z]+$/.test(BANK_DETAILS.upiId)) problems.push("UPI ID does not look right");

if (process.argv.includes("--check")) {
  if (fingerprint !== BANK_DETAILS_SEAL) problems.push("seal does not match the bank details");
  if (problems.length) {
    console.error("Bank details check FAILED:\n  - " + problems.join("\n  - "));
    console.error("If the change is intended, run: node scripts/bank-details-seal.mjs");
    process.exit(1);
  }
  console.log(`Bank details seal ok (${fingerprint.slice(0, 8)})`);
} else {
  console.log(`Account : ${BANK_DETAILS.accountNumber}  ${BANK_DETAILS.ifsc}`);
  console.log(`UPI     : ${UPI_PAY_URI}`);
  if (problems.length) console.log("Problems:\n  - " + problems.join("\n  - "));
  console.log(`\nPaste this into BANK_DETAILS_SEAL:\n${fingerprint}`);
}
