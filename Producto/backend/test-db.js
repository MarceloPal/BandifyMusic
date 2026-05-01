require('dotenv').config();
const pool = require('./src/db/index');

async function probarConexion() {
  try {
    console.log('⏳ Intentando conectar a Railway...');
    
    // Hacemos una consulta súper básica para pedir la hora del servidor y contar las tablas
    const resultado = await pool.query('SELECT NOW() AS hora_actual');
    console.log(' ¡Conexión exitosa! La base de datos responde.');
    console.log(' Hora en el servidor BD:', resultado.rows[0].hora_actual);

  } catch (error) {
    console.error('Error al conectar con la base de datos:');
    console.error(error.message);
  } finally {
    // Cerramos la conexión para que el script termine
    await pool.end();
  }
}

probarConexion();