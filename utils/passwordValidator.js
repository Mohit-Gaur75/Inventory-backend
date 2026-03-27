const validatePassword = (password) => {
  const errors = [];

  if (password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }
  if (!/[a-zA-Z]/.test(password)) {
  errors.push("Password must contain at least one letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength:
      errors.length === 0 ? "strong" :
      errors.length <= 2   ? "medium" : "weak",
  };
};

module.exports = { validatePassword };