#!/bin/bash

echo "Updating database schema with new tag tables..."
echo "This will preserve your existing data."

# Use db push to update the schema without migrations
npx prisma db push

echo "Database schema updated successfully!"
echo "Run 'npx prisma generate' if you haven't already."
