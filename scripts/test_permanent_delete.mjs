#!/usr/bin/env node

/**
 * Test spécifique pour la suppression définitive des tenants inactifs
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

async function testPermanentDelete() {
  log("🧪 Test de suppression définitive d'un tenant inactif...", "blue");

  // 1. Créer un tenant
  const tenantData = {
    name: "Test Permanent Delete",
    slug: "test-permanent-delete",
    description: "Test de suppression définitive",
  };

  const { response: createResponse, data: createdTenant } = await makeRequest(
    `${BASE_URL}/api/admin/tenants`,
    {
      method: "POST",
      body: JSON.stringify(tenantData),
    }
  );

  if (!createResponse.ok || !createdTenant) {
    log("❌ Impossible de créer un tenant pour le test", "red");
    return false;
  }

  log(`✅ Tenant créé: ${createdTenant.name}`, "green");

  // 2. Désactiver le tenant
  const { response: deactivateResponse } = await makeRequest(
    `${BASE_URL}/api/admin/tenants/${createdTenant.id}`,
    {
      method: "DELETE",
    }
  );

  if (!deactivateResponse.ok) {
    log("❌ Impossible de désactiver le tenant", "red");
    return false;
  }

  log("✅ Tenant désactivé", "green");

  // 3. Tenter de supprimer définitivement
  const { response: deleteResponse, data: deleteData } = await makeRequest(
    `${BASE_URL}/api/admin/tenants/${createdTenant.id}/permanent`,
    {
      method: "DELETE",
    }
  );

  if (deleteResponse.ok) {
    log("✅ Tenant supprimé définitivement avec succès", "green");
    return true;
  } else {
    log(`❌ Erreur de suppression définitive: ${deleteData.error}`, "red");
    return false;
  }
}

async function testPermanentDeleteActiveTenant() {
  log(
    "🧪 Test de suppression définitive d'un tenant actif (doit échouer)...",
    "blue"
  );

  // Créer un tenant actif
  const tenantData = {
    name: "Test Active Delete",
    slug: "test-active-delete",
    description: "Test de suppression d'un tenant actif",
  };

  const { response: createResponse, data: createdTenant } = await makeRequest(
    `${BASE_URL}/api/admin/tenants`,
    {
      method: "POST",
      body: JSON.stringify(tenantData),
    }
  );

  if (!createResponse.ok || !createdTenant) {
    log("❌ Impossible de créer un tenant pour le test", "red");
    return false;
  }

  // Tenter de supprimer définitivement un tenant actif
  const { response: deleteResponse, data: deleteData } = await makeRequest(
    `${BASE_URL}/api/admin/tenants/${createdTenant.id}/permanent`,
    {
      method: "DELETE",
    }
  );

  if (!deleteResponse.ok && deleteData.error.includes("actif")) {
    log(
      "✅ Protection fonctionne: impossible de supprimer un tenant actif",
      "green"
    );

    // Nettoyer - désactiver puis supprimer
    await makeRequest(`${BASE_URL}/api/admin/tenants/${createdTenant.id}`, {
      method: "DELETE",
    });
    await makeRequest(
      `${BASE_URL}/api/admin/tenants/${createdTenant.id}/permanent`,
      {
        method: "DELETE",
      }
    );

    return true;
  } else {
    log("❌ La protection ne fonctionne pas", "red");
    return false;
  }
}

async function runTests() {
  log("🚀 Test de suppression définitive des tenants", "blue");
  log("=".repeat(50), "blue");

  let allTestsPassed = true;

  try {
    const test1 = await testPermanentDelete();
    if (!test1) allTestsPassed = false;

    const test2 = await testPermanentDeleteActiveTenant();
    if (!test2) allTestsPassed = false;
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    allTestsPassed = false;
  }

  log("\n" + "=".repeat(50), "blue");
  if (allTestsPassed) {
    log("🎉 Tous les tests de suppression définitive sont passés !", "green");
  } else {
    log("💥 Certains tests ont échoué", "red");
  }
  log("=".repeat(50), "blue");
}

runTests().catch(console.error);
