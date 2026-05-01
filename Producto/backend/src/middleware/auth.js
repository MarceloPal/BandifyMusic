const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token inválido o no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
      if (err) {
        return res.status(401).json({ error: 'Token expirado o inválido' });
      }
      req.usuario = { id: payload.id, email: payload.email, nombre: payload.nombre };
      next();
    });
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
