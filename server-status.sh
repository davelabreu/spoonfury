#!/bin/bash

# Colors for better visibility
CYAN='\033[036m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
GRAY='\033[90m'
NC='\033[0m' # No Color

# Configuration
DJANGO_PORT=8000
VITE_PORT=5173

# Helper to find PID with verbose output
find_pid_verbose() {
    local port=$1
    echo -e "${GRAY}Running: netstat -ano | grep :$port | grep LISTENING | awk '{print \$5}'${NC}" >&2
    pid=$(netstat -ano | grep ":$port " | grep "LISTENING" | awk '{print $5}' | head -n 1)
    echo $pid
}

# Helper to kill with verbose output
kill_verbose() {
    local port=$1
    local label=$2
    echo -e "\n${YELLOW}[Targeting $label on Port $port]${NC}"
    
    # Constructing the exact command string for display
    local cmd="netstat -ano | grep :$port | awk '{print \$5}' | head -n 1 | xargs -r taskkill //F //PID"
    
    echo -e "${CYAN}Executing: ${NC}$cmd"
    
    # Execute and capture output
    eval "$cmd"
}

echo -e "\n${CYAN}========================================"
echo -e "   SPOONFURY ADVANCED SERVER MANAGER"
echo -e "========================================${NC}"

# Status Check Phase
echo -e "${YELLOW}Gathering Intelligence...${NC}"
D_PID=$(find_pid_verbose $DJANGO_PORT)
V_PID=$(find_pid_verbose $VITE_PORT)

echo -e "\n--- Current Status ---"
if [ -n "$D_PID" ]; then
    echo -e "Backend (Django): ${GREEN}RUNNING${NC} (PID: $D_PID)"
else
    echo -e "Backend (Django): ${GRAY}OFF${NC}"
fi

if [ -n "$V_PID" ]; then
    echo -e "Frontend (Vite):  ${GREEN}RUNNING${NC} (PID: $V_PID)"
else
    echo -e "Frontend (Vite):  ${GRAY}OFF${NC}"
fi

echo -e "--------------------------------"
echo "1) Kill Django"
echo "2) Kill Vite"
echo "3) Kill BOTH"
echo "q) Quit"
read -p "Selection: " choice

case $choice in
    1)
        kill_verbose $DJANGO_PORT "Django"
        ;;
    2)
        kill_verbose $VITE_PORT "Vite"
        ;;
    3)
        echo -e "${RED}Initiating total cleanup...${NC}"
        kill_verbose $DJANGO_PORT "Django"
        kill_verbose $VITE_PORT "Vite"
        ;;
    *)
        echo -e "${GRAY}No action taken. Exiting.${NC}"
        exit 0
        ;;
esac

echo -e "\n${CYAN}Operation Complete.${NC}"