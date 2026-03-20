#!/bin/bash

# Fonction pour fermer les anciennes fenêtres Terminal (sauf celle qui lance l'app)
close_old_terminal_windows() {
  if [ "$TERM_PROGRAM" = "Apple_Terminal" ] || [ "$TERM_PROGRAM" = "iTerm.app" ]; then
    # Obtenir l'ID de la fenêtre Terminal actuelle (celle qui lance ce script)
    CURRENT_WINDOW_ID=$(osascript -e 'tell application "Terminal" to get id of front window' 2>/dev/null)
    
    # Fermer toutes les autres fenêtres Terminal
    osascript <<EOF 2>/dev/null
tell application "Terminal"
  set currentWindowId to $CURRENT_WINDOW_ID
  repeat with w in windows
    try
      set windowId to id of w
      if windowId is not currentWindowId then
        close w
      end if
    end try
  end repeat
end tell
EOF
  fi
}

# Fonction pour fermer Terminal proprement
close_terminal() {
  TEMP_FILE="/tmp/transporter-close-terminal"
  if [ -f "$TEMP_FILE" ] && ([ "$TERM_PROGRAM" = "Apple_Terminal" ] || [ "$TERM_PROGRAM" = "iTerm.app" ]); then
    # Supprimer le fichier temporaire
    rm -f "$TEMP_FILE"
    
    # Attendre un peu pour que tous les processus se terminent
    sleep 0.3
    
    # Fermer Terminal sans demander de confirmation
    # On utilise System Events pour simuler Cmd+Q, ce qui évite la modale
    osascript -e 'tell application "System Events" to tell process "Terminal" to keystroke "q" using {command down}' 2>/dev/null
    
    # Attendre un peu pour que la commande soit exécutée
    sleep 0.5
    
    # Si Terminal est toujours ouvert, forcer la fermeture
    if pgrep -x "Terminal" > /dev/null 2>&1; then
      # Fermer toutes les fenêtres Terminal puis quitter
      osascript -e 'tell application "Terminal" to quit saving no' 2>/dev/null
    fi
  fi
}

# Installer un trap pour exécuter close_terminal quand le script se termine
trap close_terminal EXIT

# Fermer les anciennes fenêtres Terminal avant de lancer l'app
close_old_terminal_windows

# Lance l'application TransPorter depuis ce dossier
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1

# Vérifier si node_modules/archiver existe, sinon installer les dépendances
if [ ! -d "node_modules/archiver" ]; then
  echo "Installation des dépendances manquantes (archiver)..."
  npm install archiver
  if [ $? -ne 0 ]; then
    echo "Erreur lors de l'installation d'archiver. Tentative d'installation complète..."
    npm install
  fi
fi

echo "Lancement de TransPorter..."
npm start

# Le trap EXIT sera automatiquement exécuté quand le script se termine

