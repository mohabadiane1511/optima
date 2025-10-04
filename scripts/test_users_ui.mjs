#!/usr/bin/env node

/**
 * Script de test d'intégration pour l'UI des utilisateurs
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

async function testUsersPage() {
  log("🧪 Test de la page des utilisateurs...", "blue");

  try {
    // D'abord, se connecter pour obtenir une session
    const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "mohabadiane67@gmail.com",
        password: "Jsq06rdd",
      }),
    });

    if (!loginResponse.ok) {
      log(`❌ Erreur de connexion: ${loginResponse.status}`, "red");
      return false;
    }

    // Récupérer les cookies de session
    const cookies = loginResponse.headers.get("set-cookie");
    if (!cookies) {
      log(`❌ Aucun cookie de session reçu`, "red");
      return false;
    }

    // Tester la page avec la session
    const response = await fetch(`${BASE_URL}/admin/users`, {
      headers: {
        Cookie: cookies,
      },
    });

    if (response.ok) {
      const html = await response.text();

      // Vérifier la présence d'éléments clés
      const checks = [
        { pattern: /Gestion des Utilisateurs/, name: "Titre de la page" },
        { pattern: /Nouvel utilisateur/, name: "Bouton de création" },
        { pattern: /Liste des Utilisateurs/, name: "Section liste" },
        { pattern: /Total Utilisateurs/, name: "Statistiques" },
        { pattern: /Propriétaires/, name: "Statistiques propriétaires" },
        { pattern: /Administrateurs/, name: "Statistiques administrateurs" },
      ];

      let allChecksPassed = true;
      checks.forEach(({ pattern, name }) => {
        if (pattern.test(html)) {
          log(`✅ ${name} trouvé`, "green");
        } else {
          log(`❌ ${name} manquant`, "red");
          allChecksPassed = false;
        }
      });

      return allChecksPassed;
    } else {
      log(`❌ Erreur HTTP ${response.status}`, "red");
      return false;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, "red");
    return false;
  }
}

async function testUserCreation() {
  log("🧪 Test de création d'utilisateur via API...", "blue");

  try {
    // Récupérer un tenant pour l'assigner
    const tenantsResponse = await fetch(`${BASE_URL}/api/admin/tenants`);
    const tenants = await tenantsResponse.json();

    if (tenants.length === 0) {
      log("❌ Aucun tenant disponible", "red");
      return false;
    }

    const userData = {
      name: "Test UI User",
      email: "test.ui@user.com",
      password: "password123",
      tenantId: tenants[0].id,
      role: "user",
    };

    const response = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (response.ok) {
      const user = await response.json();
      log(`✅ Utilisateur créé: ${user.name} (${user.email})`, "green");
      return user;
    } else {
      const error = await response.json();
      log(`❌ Erreur ${response.status}: ${error.error}`, "red");
      return null;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, "red");
    return null;
  }
}

async function testUserUpdate(userId) {
  log(`🧪 Test de mise à jour d'utilisateur ${userId}...`, "blue");

  try {
    const updateData = {
      name: "Test UI User Modifié",
      role: "admin",
    };

    const response = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      const user = await response.json();
      log(`✅ Utilisateur modifié: ${user.name}`, "green");
      return true;
    } else {
      const error = await response.json();
      log(`❌ Erreur ${response.status}: ${error.error}`, "red");
      return false;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, "red");
    return false;
  }
}

async function testUserDeletion(userId) {
  log(`🧪 Test de suppression d'utilisateur ${userId}...`, "blue");

  try {
    const response = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      log(`✅ Utilisateur supprimé avec succès`, "green");
      return true;
    } else {
      const error = await response.json();
      log(`❌ Erreur ${response.status}: ${error.error}`, "red");
      return false;
    }
  } catch (error) {
    log(`❌ Erreur: ${error.message}`, "red");
    return false;
  }
}

async function runUITests() {
  log(
    "🚀 Démarrage des tests d'intégration pour l'UI des utilisateurs",
    "blue"
  );
  log("=".repeat(60), "blue");

  let allTestsPassed = true;
  let createdUser = null;

  try {
    // Test 1: Vérifier la page des utilisateurs
    const pageTest = await testUsersPage();
    if (!pageTest) allTestsPassed = false;

    // Test 2: Créer un utilisateur
    createdUser = await testUserCreation();
    if (!createdUser) allTestsPassed = false;

    // Test 3: Mettre à jour l'utilisateur
    if (createdUser) {
      const updateTest = await testUserUpdate(createdUser.id);
      if (!updateTest) allTestsPassed = false;
    }

    // Test 4: Supprimer l'utilisateur
    if (createdUser) {
      const deleteTest = await testUserDeletion(createdUser.id);
      if (!deleteTest) allTestsPassed = false;
    }
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    allTestsPassed = false;
  }

  log("\n" + "=".repeat(60), "blue");
  if (allTestsPassed) {
    log("🎉 Tous les tests UI utilisateurs sont passés avec succès !", "green");
  } else {
    log("💥 Certains tests UI utilisateurs ont échoué", "red");
  }
  log("=".repeat(60), "blue");
}

runUITests().catch(console.error);
