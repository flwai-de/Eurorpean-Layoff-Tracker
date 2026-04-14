#!/bin/sh

# Start the BullMQ worker in the background
node_modules/.bin/tsx src/workers/index.ts &
WORKER_PID=$!

# Start Next.js server in the foreground
node server.js &
NEXTJS_PID=$!

# If either process dies, kill both and exit
trap "kill $WORKER_PID $NEXTJS_PID 2>/dev/null; exit 1" SIGTERM SIGINT

# Wait for either to exit
wait -n $NEXTJS_PID $WORKER_PID
EXIT_CODE=$?

# Kill the remaining process
kill $WORKER_PID $NEXTJS_PID 2>/dev/null
exit $EXIT_CODE
