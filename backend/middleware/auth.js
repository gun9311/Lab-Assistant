const jwt = require("jsonwebtoken");

const auth = (role) => async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 역할 검증 로직: 문자열 or 배열 모두 처리
    if (role) {
      const allowedRoles = Array.isArray(role) ? role : [role];
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).send({ error: "Access denied" });
      }
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).send({ error: "Token has expired." });
    }
    res.status(401).send({ error: "Please authenticate." });
  }
};

module.exports = auth;
