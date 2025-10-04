#!/usr/bin/env node

/**
 * Script de test d'intégration pour l'API des utilisateurs
 */

const BASE_URL = "http://localhost:3000";

// Couleurs pour les logs
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { error: error.message };
  }
}

async function getFirstTenant() {
  const { response, data } = await makeRequest(`${BASE_URL}/api/admin/tenants`);

  if (response.ok && data.length > 0) {
    return data[0];
  }
  return null;
}

async function testCreateUser() {
  log("🧪 Test de création d'utilisateur...", "blue");

  // Récupérer un tenant pour l'assigner
  const tenant = await getFirstTenant();
  if (!tenant) {
    log("❌ Aucun tenant disponible pour le test", "red");
    return null;
  }

  const userData = {
    name: "Test User API",
    email: "test.user@api.com",
    password: "password123",
    tenantId: tenant.id,
    role: "user",
  };

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/users`,
    {
      method: "POST",
      body: JSON.stringify(userData),
    }
  );

  if (error) {
    log(`❌ Erreur: ${error}`, "red");
    return null;
  }

  if (response.ok) {
    log(`✅ Utilisateur créé: ${data.name} (${data.email})`, "green");
    return data;
  } else {
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return null;
  }
}

async function testGetUsers() {
  log("🧪 Test de récupération des utilisateurs...", "blue");

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/users`
  );

  if (error) {
    log(`❌ Erreur: ${error}`, "red");
    return [];
  }

  if (response.ok) {
    log(`✅ ${data.length} utilisateur(s) récupéré(s)`, "green");
    data.forEach((user) => {
      log(
        `   - ${user.name} (${user.email}) - ${user.memberships.length} entreprise(s)`,
        "yellow"
      );
    });
    return data;
  } else {
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return [];
  }
}

async function testUpdateUser(userId) {
  log(`🧪 Test de mise à jour de l'utilisateur ${userId}...`, "blue");

  const updateData = {
    name: "Test User API Modifié",
    role: "admin",
  };

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/users/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify(updateData),
    }
  );

  if (error) {
    log(`❌ Erreur: ${error}`, "red");
    return null;
  }

  if (response.ok) {
    log(`✅ Utilisateur modifié: ${data.name}`, "green");
    return data;
  } else {
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return null;
  }
}

async function testDeleteUser(userId) {
  log(`🧪 Test de suppression de l'utilisateur ${userId}...`, "blue");

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/users/${userId}`,
    {
      method: "DELETE",
    }
  );

  if (error) {
    log(`❌ Erreur: ${error}`, "red");
    return false;
  }

  if (response.ok) {
    log(`✅ Utilisateur supprimé avec succès`, "green");
    return true;
  } else {
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return false;
  }
}

async function runTests() {
  log(
    "🚀 Démarrage des tests d'intégration pour l'API des utilisateurs",
    "blue"
  );
  log("=".repeat(60), "blue");

  let createdUser = null;
  let allTestsPassed = true;

  try {
    // Test 1: Créer un utilisateur
    createdUser = await testCreateUser();
    if (!createdUser) allTestsPassed = false;

    // Test 2: Récupérer tous les utilisateurs
    const users = await testGetUsers();
    if (users.length === 0) allTestsPassed = false;

    // Test 3: Mettre à jour l'utilisateur
    if (createdUser) {
      const updatedUser = await testUpdateUser(createdUser.id);
      if (!updatedUser) allTestsPassed = false;
    }

    // Test 4: Supprimer l'utilisateur
    if (createdUser) {
      const deleted = await testDeleteUser(createdUser.id);
      if (!deleted) allTestsPassed = false;
    }
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    allTestsPassed = false;
  }

  log("\n" + "=".repeat(60), "blue");
  if (allTestsPassed) {
    log("🎉 Tous les tests utilisateurs sont passés avec succès !", "green");
  } else {
    log("💥 Certains tests utilisateurs ont échoué", "red");
  }
  log("=".repeat(60), "blue");
}

runTests().catch(console.error);
