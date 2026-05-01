/**
 * Singleton de AWS S3Client.
 *
 * Importar este módulo en lugar de instanciar S3Client en cada ruta evita
 * abrir una nueva conexión TCP en cada request y agota los file-descriptors
 * del proceso en producción.
 *
 * El cliente lee sus credenciales desde las variables de entorno:
 *   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = s3;
