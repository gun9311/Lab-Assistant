const jwt = require('jsonwebtoken');

const auth = (role) => async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (role && decoded.role !== role) {
      return res.status(403).send({ error: 'Access denied' });
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

module.exports = auth;