// Compatibility exports for existing server/client modules. New code should import
// from @/env/client or @/env/server directly so server-only secrets never leak.
import { clientEnv } from "@/env/client";
import { serverEnv } from "@/env/server";

export const cluster = clientEnv.solanaCluster;
export const publicRpcUrl = clientEnv.solanaRpcUrl;
export const rpcUrl = serverEnv.solanaRpcUrl;
export const programIdString = serverEnv.powerPayProgramId || clientEnv.powerPayProgramId;
export const appUrl = clientEnv.appUrl;
