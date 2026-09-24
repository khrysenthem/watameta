import { App } from "aws-cdk-lib";
import { WatametaStack } from "../lib/watameta-stack.js";
import { developmentConfig, productionConfig, type EnvironmentConfig } from "../lib/config.js";

const app = new App();

// Which environment to build is required, not defaulted — an app with both
// stacks always defined meant `cdk deploy` (no selector) or a typo'd stack
// name could touch the wrong one. Passing -c env=<name> means only that
// environment's stack ever exists in this App at all.
const envName: unknown = app.node.tryGetContext("env");
if (envName !== "development" && envName !== "production") {
  throw new Error(
    `Missing or invalid -c env=<name>: must be "development" or "production" (got ${JSON.stringify(envName)}). ` +
      'Pass it on every cdk command, e.g. `cdk deploy -c env=development`.',
  );
}

const configs: Record<"development" | "production", EnvironmentConfig> = {
  development: developmentConfig,
  production: productionConfig,
};
const stackNames: Record<"development" | "production", string> = {
  development: "WatametaDevelopment",
  production: "WatametaProduction",
};

// Left environment-agnostic (no explicit account/region) unless the usual
// AWS CLI/CDK env vars are set — `cdk deploy` picks up whatever profile is
// active at deploy time.
const env =
  process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION
    ? { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
    : undefined;

new WatametaStack(app, stackNames[envName], { config: configs[envName], env });
