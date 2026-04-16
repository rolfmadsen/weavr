#!/bin/bash

# Vi forsøger at indlæse dit user-environment for at finde nvm / node
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
elif [ -s "$HOME/.bashrc" ]; then
  source "$HOME/.bashrc"
fi

# Hvis FNM bruges
if command -v fnm &> /dev/null; then
  eval "$(fnm env)"
fi

# Alternativt forsøg at finde n som node manager
export PATH="$HOME/n/bin:$PATH"

# Nu burde `node` findes
exec node /home/rolfmadsen/Github/weavr/tools/weavr-gen/dist/mcp.js
