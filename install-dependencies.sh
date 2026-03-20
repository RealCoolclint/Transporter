#!/bin/bash

# Script d'installation des dépendances pour TransPorter
# Ce script installe toutes les dépendances nécessaires, y compris archiver

cd "$(dirname "$0")"

echo "Installation des dépendances pour TransPorter..."
npm install

if [ $? -eq 0 ]; then
  echo "✓ Dépendances installées avec succès"
  echo "✓ Le package 'archiver' est maintenant disponible"
else
  echo "✗ Erreur lors de l'installation des dépendances"
  exit 1
fi

