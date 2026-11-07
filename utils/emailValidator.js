const dns = require("dns");

const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 1 });
// Fall back to reliable public DNS resolvers
try {
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const COMMON_TYPOS = {
  "gmaill.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
};

/**
 * Validates email syntax, checks for domain existence, and flags common typos.
 */
const validateEmail = async (email) => {
  if (!email || typeof email !== "string") {
    return { isValid: false, message: "Email is required" };
  }

  const clean = email.trim().toLowerCase();

  // 1. Syntax format check
  if (!EMAIL_REGEX.test(clean)) {
    return {
      isValid: false,
      message: "Invalid email format. Please check the address structure.",
    };
  }

  const parts = clean.split("@");
  if (parts.length !== 2) {
    return { isValid: false, message: "Invalid email format" };
  }

  const [userPart, domain] = parts;

  if (userPart.length === 0 || domain.length < 3 || !domain.includes(".")) {
    return {
      isValid: false,
      message: "Invalid email format. Domain name is missing or incomplete.",
    };
  }

  // 2. Common typo check
  if (COMMON_TYPOS[domain]) {
    return {
      isValid: false,
      message: `Did you mean @${COMMON_TYPOS[domain]} instead of @${domain}?`,
    };
  }

  // 3. DNS Domain Verification (ensure domain exists and has mail exchange / A records)
  try {
    const mx = await resolver.resolveMx(domain);
    if (!mx || mx.length === 0) {
      // Fallback: check if domain has an A record (some servers handle mail directly)
      const a = await resolver.resolve4(domain);
      if (!a || a.length === 0) {
        return {
          isValid: false,
          message: `The domain "${domain}" does not exist or cannot receive emails.`,
        };
      }
    }
  } catch (err) {
    if (err.code === "ENOTFOUND" || err.code === "ENODATA" || err.code === "NXDOMAIN") {
      return {
        isValid: false,
        message: `The email domain "${domain}" does not exist. Please use a valid email address.`,
      };
    }
    // Fail open on DNS timeout / network connectivity issues so legitimate users are not blocked
  }

  return { isValid: true, email: clean };
};

module.exports = { validateEmail };
