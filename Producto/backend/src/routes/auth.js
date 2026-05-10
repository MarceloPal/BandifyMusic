const express        = require('express');
const authController  = require('../controllers/authController');

const router = express.Router();

/**
 * @swagger
 * /auth/registro:
 *   post:
 *     summary: Crear cuenta nueva
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, password]
 *             properties:
 *               nombre:           { type: string }
 *               email:            { type: string, format: email }
 *               password:         { type: string, minLength: 8 }
 *               instrumento:      { type: string }
 *               ciudad:           { type: string }
 *               fecha_nacimiento: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Usuario creado + JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthTokenResponse' }
 *       400: { description: Faltan campos obligatorios }
 *       409: { description: Email ya registrado }
 */
router.post('/registro', authController.registro);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Sesión iniciada — devuelve JWT + usuario
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthTokenResponse' }
 *       401: { description: Credenciales inválidas }
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Solicita link de reset por email
 *     description: Siempre responde 200 (anti-enumeration). Email se envía async.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: '{ ok: true } siempre, exista o no el email' }
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Setea nueva contraseña usando token de reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:    { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Contraseña actualizada }
 *       400: { description: Token inválido, expirado o usado }
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;
