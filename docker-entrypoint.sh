#!/bin/sh
set -e

echo "Running database migrations..."
npm run migrate:latest

echo "Starting API server..."
exec node dist/server.js
