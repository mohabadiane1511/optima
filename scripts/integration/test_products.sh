#!/bin/sh
set -e

HOST_HEADER=${1:-synaptik.localhost:3000}
BASE=http://localhost:3000

echo "Running tenant products integration against Host: $HOST_HEADER"

sku=PRD-$(date +%s)
cat_name=Cat-$sku

echo "1) Create category: $cat_name"
cat_resp=$(curl -s -H "Host: $HOST_HEADER" -H "Content-Type: application/json" \
  -d "{\"name\":\"$cat_name\"}" "$BASE/api/tenant/categories")
echo "   -> $cat_resp"
cat_id=$(echo "$cat_resp" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
if [ -z "$cat_id" ]; then
  echo "Category creation failed"
  exit 1
fi

echo "2) Create product: $sku"
prd_resp=$(curl -s -H "Host: $HOST_HEADER" -H "Content-Type: application/json" \
  -d "{\"sku\":\"$sku\",\"name\":\"Produit $sku\",\"salePrice\":1500,\"purchasePrice\":1200,\"unit\":\"unité\",\"active\":true,\"categoryId\":\"$cat_id\"}" "$BASE/api/tenant/products")
echo "   -> $prd_resp"
echo "$prd_resp" | grep -q "$sku" || { echo "Product creation failed"; exit 1; }

echo "3) List products and check presence"
list_resp=$(curl -s -H "Host: $HOST_HEADER" "$BASE/api/tenant/products")
echo "$list_resp" | grep -q "$sku" || { echo "Product not found in list"; exit 1; }

echo "OK: product $sku created and listed."


