#!/usr/bin/env node

/**
 * Script de test d'intégration pour l'API des tenants
 * Teste toutes les opérations CRUD via des appels HTTP réels
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

async function testCreateTenant() {
  log("\n🧪 Test de création de tenant...", "blue");

  const tenantData = {
    name: "Entreprise Test API",
    slug: "entreprise-test-api",
    description: "Entreprise créée via test API",
    contactEmail: "test@entreprise.com",
    contactPhone: "+221 77 123 45 67",
  };

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
    log(`✅ Tenant créé avec succès: ${data.name} (ID: ${data.id})`, "green");
    return data;
  } else {
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return null;
  }
}

async function testGetTenants() {
  log("\n🧪 Test de récupération des tenants...", "blue");

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/tenants`
  );

  if (error) {
    log(`❌ Erreur: ${error}`, "red");
    return [];
  }

  if (response.ok) {
    log(`✅ ${data.length} tenant(s) récupéré(s)`, "green");
    data.forEach((tenant) => {
      log(`   - ${tenant.name} (${tenant.slug}) - ${tenant.status}`, "yellow");
    });
    return data;
  } else {
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return [];
  }
}

async function testGetTenantById(tenantId) {
  log(`\n🧪 Test de récupération du tenant ${tenantId}...`, "blue");

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/tenants/${tenantId}`
  );

  if (error) {
    log(`❌ Erreur: ${error}`, "red");
    return null;
  }

  if (response.ok) {
    log(`✅ Tenant récupéré: ${data.name}`, "green");
    return data;
  } else {
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return null;
  }
}

async function testUpdateTenant(tenantId) {
  log(`\n🧪 Test de mise à jour du tenant ${tenantId}...`, "blue");

  const updateData = {
    name: "Entreprise Test API Modifiée",
    description: "Description modifiée via test API",
    contactEmail: "modifie@entreprise.com",
  };

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/tenants/${tenantId}`,
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
    log(`✅ Tenant modifié: ${data.name}`, "green");
    return data;
  } else {
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return null;
  }
}

async function testDeactivateTenant(tenantId) {
  log(`\n🧪 Test de désactivation du tenant ${tenantId}...`, "blue");

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/tenants/${tenantId}`,
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
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return false;
  }
}

async function testReactivateTenant(tenantId) {
  log(`\n🧪 Test de réactivation du tenant ${tenantId}...`, "blue");

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/tenants/${tenantId}`,
    {
      method: "PATCH",
    }
  );

  if (error) {
    log(`❌ Erreur: ${error}`, "red");
    return false;
  }

  if (response.ok) {
    log(`✅ Tenant réactivé avec succès`, "green");
    return true;
  } else {
    log(`❌ Erreur ${response.status}: ${data.error}`, "red");
    return false;
  }
}

async function testSlugUniqueness() {
  log("\n🧪 Test d'unicité du slug...", "blue");

  const duplicateData = {
    name: "Entreprise Duplicate",
    slug: "entreprise-test-api", // Slug déjà utilisé
  };

  const { response, data, error } = await makeRequest(
    `${BASE_URL}/api/admin/tenants`,
    {
      method: "POST",
      body: JSON.stringify(duplicateData),
    }
  );

  if (error) {
    log(`❌ Erreur: ${error}`, "red");
    return false;
  }

  if (!response.ok && data.error === "Ce slug est déjà utilisé") {
    log(`✅ Validation d'unicité fonctionne correctement`, "green");
    return true;
  } else {
    log(`❌ La validation d'unicité ne fonctionne pas`, "red");
    return false;
  }
}

async function runTests() {
  log("🚀 Démarrage des tests d'intégration pour l'API des tenants", "blue");
  log("=".repeat(60), "blue");

  let createdTenant = null;
  let allTestsPassed = true;

  try {
    // Test 1: Créer un tenant
    createdTenant = await testCreateTenant();
    if (!createdTenant) allTestsPassed = false;

    // Test 2: Récupérer tous les tenants
    const tenants = await testGetTenants();
    if (tenants.length === 0) allTestsPassed = false;

    // Test 3: Récupérer un tenant spécifique
    if (createdTenant) {
      const retrievedTenant = await testGetTenantById(createdTenant.id);
      if (!retrievedTenant) allTestsPassed = false;
    }

    // Test 4: Mettre à jour un tenant
    if (createdTenant) {
      const updatedTenant = await testUpdateTenant(createdTenant.id);
      if (!updatedTenant) allTestsPassed = false;
    }

    // Test 5: Tester l'unicité du slug
    const slugTest = await testSlugUniqueness();
    if (!slugTest) allTestsPassed = false;

    // Test 6: Désactiver le tenant de test
    if (createdTenant) {
      const deactivated = await testDeactivateTenant(createdTenant.id);
      if (!deactivated) allTestsPassed = false;

      // Test 7: Réactiver le tenant
      if (deactivated) {
        const reactivated = await testReactivateTenant(createdTenant.id);
        if (!reactivated) allTestsPassed = false;
      }
    }
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, "red");
    allTestsPassed = false;
  }

  log("\n" + "=".repeat(60), "blue");
  if (allTestsPassed) {
    log("🎉 Tous les tests sont passés avec succès !", "green");
  } else {
    log("💥 Certains tests ont échoué", "red");
  }
  log("=".repeat(60), "blue");
}

// Vérifier que le serveur est accessible
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

async function main() {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    log("❌ Le serveur n'est pas accessible sur http://localhost:3000", "red");
    log("   Assurez-vous que le serveur Next.js est démarré", "yellow");
    process.exit(1);
  }

  await runTests();
}

main().catch(console.error);
