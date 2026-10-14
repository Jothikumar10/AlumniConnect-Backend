
/*
|--------------------------------------------------------------------------
| Admin Only Middleware
|--------------------------------------------------------------------------
| Allows access only to authenticated users whose role is "admin".
| Use after the protect middleware.
|--------------------------------------------------------------------------
*/

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please login.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges are required.",
    });
  }

  next();
};

module.exports = adminOnly;
