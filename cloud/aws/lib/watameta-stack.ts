import { Construct } from "constructs";
import { Stack, type StackProps, Tags } from "aws-cdk-lib";
import type { EnvironmentConfig } from "./config.js";
import { NetworkConstruct } from "./network-construct.js";
import { SecretsConstruct } from "./secrets-construct.js";
import { DatabaseConstruct } from "./database-construct.js";
import { ApiConstruct } from "./api-construct.js";

export interface WatametaStackProps extends StackProps {
  config: EnvironmentConfig;
}

export class WatametaStack extends Stack {
  constructor(scope: Construct, id: string, props: WatametaStackProps) {
    super(scope, id, props);
    const { config } = props;

    const network = new NetworkConstruct(this, "Network", config);
    const secrets = new SecretsConstruct(this, "Secrets");
    const database = new DatabaseConstruct(this, "Database", network.vpc, config);

    new ApiConstruct(this, "Api", {
      vpc: network.vpc,
      config,
      databaseSecurityGroup: database.securityGroup,
      secrets,
    });

    Tags.of(this).add("project", "watameta");
    Tags.of(this).add("environment", config.envName);
  }
}
