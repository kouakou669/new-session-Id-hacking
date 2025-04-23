const { Pool } = require('pg');

// Remplacez par votre URL de connexion Render
const pool = new Pool({
  connectionString: 'postgres://user:password@host:port/database',
});

// Fonction pour insérer une nouvelle session
async function insertSession(sessionId) {
  const query = 'INSERT INTO sessions(session_id) VALUES($1)';
  const values = [sessionId];

  try {
    await pool.query(query, values);
    console.log('Session insérée:', sessionId);
  } catch (err) {
    console.error('Erreur lors de l\'insertion de la session:', err.stack);
  }
}

// Fonction pour récupérer toutes les sessions
async function getSessions() {
  const query = 'SELECT * FROM sessions';
  
  try {
    const res = await pool.query(query);
    return res.rows; // Retourne les sessions
  } catch (err) {
    console.error('Erreur lors de la récupération des sessions:', err.stack);
    return [];
  }
}

// Exporter les fonctions
module.exports = {
  insertSession,
  getSessions,
};
