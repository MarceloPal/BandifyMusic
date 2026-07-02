require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;


//Esto es una pool que se conecta a una base de datos PostgreSQL utilizando la biblioteca 'pg'. 
// La configuración de la conexión se obtiene de las variables de entorno,
// y se establece una conexión segura con SSL. 
// Luego, se exporta el pool para que pueda ser utilizado en otras partes de la aplicación para realizar consultas a la base de datos.
// Una pool es una colección de conexiones a la base de datos que se pueden reutilizar, 
// lo que mejora el rendimiento al evitar la necesidad de establecer una nueva conexión cada vez que se realiza una consulta.