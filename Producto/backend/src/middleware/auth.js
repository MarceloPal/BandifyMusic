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
      req.usuario = {
        id: payload.id,
        email: payload.email,
        nombre: payload.nombre,
        role: payload.role || 'user'
      };
      next();
    });
  } catch (error) {
    next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.usuario || req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  next();
};

authMiddleware.requireAdmin = requireAdmin;

module.exports = authMiddleware;
