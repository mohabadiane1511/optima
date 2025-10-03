#!/usr/bin/env node

/**
 * Script de test d'intégration pour l'interface des tenants
 * Teste l'interface utilisateur via des interactions réelles
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

async function testLogin() {
  log("\n🧪 Test de connexion super admin...", "blue");

  try {
    // Simuler la connexion
    const { response, data } = await makeRequest(
      `${BASE_URL}/api/admin/login`,
      {
        method: "POST",
        body: JSON.stringify({
          email: "mohabadiane67@gmail.com",
          password: "Jsq06rdd",
        }),
      }
    );

    if (response.ok) {
      log("✅ Connexion super admin réussie", "green");
      return true;
    } else {
      log(`❌ Erreur de connexion: ${data.error}`, "red");
      return false;
    }
  } catch (error) {
    log(`❌ Erreur de connexion: ${error}`, "red");
    return false;
  }
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

async function testTenantsPageAccess() {
  log("\n🧪 Test d'accès à la page des tenants...", "blue");

  try {
    const { response, error } = await makeRequest(`${BASE_URL}/admin/tenants`);

    if (error) {
      log(`❌ Erreur: ${error}`, "red");
      return false;
    }

    if (response.ok) {
      log("✅ Page des tenants accessible", "green");
      return true;
    } else {
      log(`❌ Erreur ${response.status} - Page non accessible`, "red");
      return false;
    }
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    return false;
  }
}

async function testCreateTenantViaUI() {
  log("\n🧪 Test de création de tenant via interface...", "blue");

  const tenantData = {
    name: "Entreprise Test UI",
    slug: "entreprise-test-ui",
    description: "Entreprise créée via test UI",
    contactEmail: "test-ui@entreprise.com",
    contactPhone: "+221 77 123 45 67",
  };

  try {
    const { response, data, error } = await makeRequest(
      `${BASE_URL}/api/admin/tenants`,
      {
        method: "POST",
        body: JSON.stringify(tenantData),
      }
    );

    if (error) {
      log(`❌ Erreur: ${error}`, "red");
      return null;
    }

    if (response.ok) {
      log(`✅ Tenant créé via API: ${data.name}`, "green");
      return data;
    } else {
      log(`❌ Erreur API ${response.status}: ${data.error}`, "red");
      return null;
    }
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    return null;
  }
}

async function testTenantValidation() {
  log("\n🧪 Test de validation des données...", "blue");

  const invalidData = {
    name: "", // Nom vide
    slug: "", // Slug vide
  };

  try {
    const { response, data, error } = await makeRequest(
      `${BASE_URL}/api/admin/tenants`,
      {
        method: "POST",
        body: JSON.stringify(invalidData),
      }
    );

    if (error) {
      log(`❌ Erreur: ${error}`, "red");
      return false;
    }

    if (!response.ok) {
      log(
        `✅ Validation fonctionne - Erreur ${response.status} attendue`,
        "green"
      );
      return true;
    } else {
      log(
        `❌ La validation ne fonctionne pas - données invalides acceptées`,
        "red"
      );
      return false;
    }
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    return false;
  }
}

async function testTenantUpdate() {
  log("\n🧪 Test de mise à jour de tenant...", "blue");

  // D'abord créer un tenant
  const tenantData = {
    name: "Entreprise Update Test",
    slug: "entreprise-update-test",
    description: "Test de mise à jour",
  };

  const { response: createResponse, data: createdTenant } = await makeRequest(
    `${BASE_URL}/api/admin/tenants`,
    {
      method: "POST",
      body: JSON.stringify(tenantData),
    }
  );

  if (!createResponse.ok || !createdTenant) {
    log("❌ Impossible de créer un tenant pour le test de mise à jour", "red");
    return false;
  }

  // Maintenant le mettre à jour
  const updateData = {
    name: "Entreprise Update Test Modifiée",
    description: "Description modifiée",
  };

  try {
    const { response, data, error } = await makeRequest(
      `${BASE_URL}/api/admin/tenants/${createdTenant.id}`,
      {
        method: "PUT",
        body: JSON.stringify(updateData),
      }
    );

    if (error) {
      log(`❌ Erreur: ${error}`, "red");
      return false;
    }

    if (response.ok) {
      log(`✅ Tenant mis à jour: ${data.name}`, "green");

      // Nettoyer - supprimer le tenant de test
      await makeRequest(`${BASE_URL}/api/admin/tenants/${createdTenant.id}`, {
        method: "DELETE",
      });

      return true;
    } else {
      log(`❌ Erreur de mise à jour ${response.status}: ${data.error}`, "red");
      return false;
    }
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    return false;
  }
}

async function testTenantDeactivation() {
  log("\n🧪 Test de désactivation de tenant...", "blue");

  // Créer un tenant pour le désactiver
  const tenantData = {
    name: "Entreprise Deactivate Test",
    slug: "entreprise-deactivate-test",
    description: "Test de désactivation",
  };

  const { response: createResponse, data: createdTenant } = await makeRequest(
    `${BASE_URL}/api/admin/tenants`,
    {
      method: "POST",
      body: JSON.stringify(tenantData),
    }
  );

  if (!createResponse.ok || !createdTenant) {
    log(
      "❌ Impossible de créer un tenant pour le test de désactivation",
      "red"
    );
    return false;
  }

  try {
    const { response, data, error } = await makeRequest(
      `${BASE_URL}/api/admin/tenants/${createdTenant.id}`,
      {
        method: "DELETE",
      }
    );

    if (error) {
      log(`❌ Erreur: ${error}`, "red");
      return false;
    }

    if (response.ok) {
      log(`✅ Tenant désactivé avec succès`, "green");
      return true;
    } else {
      log(
        `❌ Erreur de désactivation ${response.status}: ${data.error}`,
        "red"
      );
      return false;
    }
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    return false;
  }
}

async function runUITests() {
  log(
    "🚀 Démarrage des tests d'intégration pour l'interface des tenants",
    "blue"
  );
  log("=".repeat(70), "blue");

  let allTestsPassed = true;

  try {
    // Test 1: Connexion
    const loginSuccess = await testLogin();
    if (!loginSuccess) allTestsPassed = false;

    // Test 2: Accès à la page
    const pageAccess = await testTenantsPageAccess();
    if (!pageAccess) allTestsPassed = false;

    // Test 3: Création via interface
    const createdTenant = await testCreateTenantViaUI();
    if (!createdTenant) allTestsPassed = false;

    // Test 4: Validation
    const validation = await testTenantValidation();
    if (!validation) allTestsPassed = false;

    // Test 5: Mise à jour
    const update = await testTenantUpdate();
    if (!update) allTestsPassed = false;

    // Test 6: Désactivation
    const deactivation = await testTenantDeactivation();
    if (!deactivation) allTestsPassed = false;

    // Nettoyer le tenant créé dans le test 3
    if (createdTenant) {
      await makeRequest(`${BASE_URL}/api/admin/tenants/${createdTenant.id}`, {
        method: "DELETE",
      });
    }
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    allTestsPassed = false;
  }

  log("\n" + "=".repeat(70), "blue");
  if (allTestsPassed) {
    log("🎉 Tous les tests d'interface sont passés avec succès !", "green");
  } else {
    log("💥 Certains tests d'interface ont échoué", "red");
  }
  log("=".repeat(70), "blue");
}

async function main() {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    log("❌ Le serveur n'est pas accessible sur http://localhost:3000", "red");
    log("   Assurez-vous que le serveur Next.js est démarré", "yellow");
    process.exit(1);
  }

  await runUITests();
}

async function checkServer() {
  try {
    const { response } = await makeRequest(`${BASE_URL}/api/admin/tenants`);
    if (response && response.status !== 404) {
      return true;
    }
  } catch (error) {
    // Ignore
  }
  return false;
}

main().catch(console.error);
