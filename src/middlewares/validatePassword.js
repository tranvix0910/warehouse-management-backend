export const validatePassword = (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ success: false, message: 'Password must be at least 8 characters' });
  }

  if (!/[A-Z]/.test(password)) {
    return res
      .status(400)
      .json({ success: false, message: 'Password must contain at least one uppercase letter' });
  }

  if (!/[a-z]/.test(password)) {
    return res
      .status(400)
      .json({ success: false, message: 'Password must contain at least one lowercase letter' });
  }

  if (!/\d/.test(password)) {
    return res
      .status(400)
      .json({ success: false, message: 'Password must contain at least one number' });
  }

  if (!/[!@#\$%\^&\*(),.?":{}|<>]/.test(password)) {
    return res
      .status(400)
      .json({ success: false, message: 'Password must contain at least one special character' });
  }

  next(); // pass sang controller nếu hợp lệ
};
