import { App } from "aws-cdk-lib";
import { WatametaStack } from "../lib/watameta-stack.js";
import { developmentConfig, productionConfig } from "../lib/config.js";

const app = new App();

// Left environment-agnostic (no explicit account/region) unless the usual
// AWS CLI/CDK env vars are set — `cdk deploy` picks up whatever profile is
// active at deploy time.
const env =
  process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION
    ? { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
    : undefined;

new WatametaStack(app, "WatametaDevelopment", { config: developmentConfig, env });
new WatametaStack(app, "WatametaProduction", { config: productionConfig, env });
