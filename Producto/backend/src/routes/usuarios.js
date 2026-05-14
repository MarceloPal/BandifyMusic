const express             = require('express');
const authMiddleware       = require('../middleware/auth');
const usuariosController   = require('../controllers/usuariosController');

const router = express.Router();

/**
 * @swagger
 * /usuarios/perfil:
 *   get:
 *     summary: Datos completos del usuario autenticado
 *     description: Incluye campos de usuarios y perfiles (bio, oficio, redes, vector audio, etc.)
 *     tags: [Usuarios]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Perfil completo }
 *       404: { description: Usuario no encontrado }
 */
router.get('/perfil', authMiddleware, usuariosController.obtenerPerfil);

/**
 * @swagger
 * /usuarios/perfil:
 *   put:
 *     summary: Actualiza datos del usuario y/o su perfil
 *     description: |
 *       Acepta cualquier subset de campos. Hace UPSERT sobre `perfiles` y
 *       UPDATE selectivo sobre `usuarios`. Devuelve el perfil completo actualizado.
 *     tags: [Usuarios]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:           { type: string }
 *               instrumento:      { type: string }
 *               ciudad:           { type: string }
 *               fecha_nacimiento: { type: string, format: date }
 *               bio:              { type: string }
 *               oficio:           { type: array, items: { type: string } }
 *               experiencia:      { type: integer }
 *               user_tags:        { type: array, items: { type: string } }
 *               foto_url:         { type: string }
 *               banner_url:       { type: string }
 *               instagram_url:    { type: string }
 *               spotify_url:      { type: string }
 *               discord_url:      { type: string }
 *               card_settings:    { type: object }
 *     responses:
 *       200: { description: Perfil actualizado }
 *       400: { description: Body vacío }
 */
router.put('/perfil', authMiddleware, usuariosController.actualizarPerfil);

/**
 * @swagger
 * /usuarios/cambiar-password:
 *   put:
 *     summary: Cambia la contraseña del usuario autenticado
 *     tags: [Usuarios]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [passwordActual, passwordNueva]
 *             properties:
 *               passwordActual: { type: string }
 *               passwordNueva:  { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Contraseña actualizada }
 *       401: { description: Contraseña actual incorrecta }
 */
router.put('/cambiar-password', authMiddleware, usuariosController.cambiarPassword);

/**
 * @swagger
 * /usuarios/cuenta:
 *   delete:
 *     summary: Elimina la cuenta del usuario autenticado
 *     description: Elimina permanentemente la cuenta y todos sus datos asociados
 *     tags: [Usuarios]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Cuenta eliminada con éxito }
 *       500: { description: Error al eliminar cuenta }
 */
router.delete('/cuenta', authMiddleware, usuariosController.eliminarMiCuenta);

module.exports = router;
