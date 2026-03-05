const passwordRegex =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;

const validatePassword = (password) => {
  if (!password || !passwordRegex.test(password)) {
    return {
      isValid: false,
      message:
        'Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character.',
    };
  }
  return { isValid: true };
};

module.exports = { validatePassword, passwordRegex };
