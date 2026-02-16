#!/bin/bash
# deploy.sh — Spoonfury deployment menu

set -e

echo ""
echo "╔═══════════════════════════════╗"
echo "║     🥄 Spoonfury Deploy       ║"
echo "╚═══════════════════════════════╝"
echo ""
echo "1) Full rebuild (all services)"
echo "2) Rebuild frontend only"
echo "3) Rebuild backend only"
echo "4) Pull latest + rebuild all"
echo "5) View logs"
echo "6) Stop all"
echo ""
read -p "Choose option: " opt

case $opt in
  1)
    echo "→ Full rebuild..."
    docker compose down
    docker compose up --build -d
    ;;
  2)
    echo "→ Rebuilding frontend..."
    docker compose up --build -d frontend
    ;;
  3)
    echo "→ Rebuilding backend..."
    docker compose up --build -d backend
    ;;
  4)
    echo "→ Pulling latest + rebuilding all..."
    git pull
    docker compose down
    docker compose up --build -d
    ;;
  5)
    docker compose logs -f
    ;;
  6)
    docker compose down
    ;;
  *)
    echo "Invalid option."
    exit 1
    ;;
esac

echo ""
echo "✓ Done. Spoonfury running at http://$(hostname -I | awk '{print $1}'):8055"
