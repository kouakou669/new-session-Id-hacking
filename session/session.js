const { Pool } = require('pg');

// Configuration de la connexion à la base de données
const pool = new Pool({
  connectionString: 'postgresql://thomas_k3lw_user:ePmbhxsGM9beyLb2Y0thgJO6WqkQvHGD@dpg-cvoqc1ngi27c73at2fmg-a.oregon-postgres.render.com/thomas_k3lw',
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
