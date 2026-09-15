import { loadServerEnv } from "@housemate/core";

// Skeleton only: the queue consumer and scheduler arrive in Slice 0 step 6.
const env = loadServerEnv();
console.log(`Housemate worker starting (${env.APP_ENV})`);
