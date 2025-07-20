#!/bin/bash

echo "Creating baseline migration for existing schema..."

# Create migrations directory if it doesn't exist
mkdir -p prisma/migrations

# Create a baseline migration for existing schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql

# Mark the baseline migration as applied
npx prisma migrate resolve --applied "0_init"

# Now create the new migration for tags
npx prisma migrate dev --name add-tagging-system
