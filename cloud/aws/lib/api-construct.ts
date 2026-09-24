import { Construct } from "constructs";
import * as path from "node:path";
import { CfnOutput } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import type { EnvironmentConfig } from "./config.js";
import type { SecretsConstruct } from "./secrets-construct.js";

const REPO_ROOT = path.join(import.meta.dirname, "..", "..", "..");

export interface ApiConstructProps {
  vpc: ec2.Vpc;
  config: EnvironmentConfig;
  databaseSecurityGroup: ec2.SecurityGroup;
  secrets: SecretsConstruct;
}

/**
 * ECS cluster + an ALB-fronted Fargate service running the Docker image
 * built from the repo root Dockerfile, plus a standalone task definition for
 * running migrations against RDS (same image, `npm run migrate` command)
 * that isn't attached to a Service — it's meant to be invoked ad hoc via
 * `aws ecs run-task` once real AWS credentials exist (see the README).
 */
export class ApiConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);
    const { vpc, config, databaseSecurityGroup, secrets } = props;

    const cluster = new ecs.Cluster(this, "Cluster", { vpc });

    const image = ecs.ContainerImage.fromAsset(REPO_ROOT);

    const appSecurityGroup = new ec2.SecurityGroup(this, "AppSecurityGroup", {
      vpc,
      description: "Watameta API tasks (the live service and the one-off migrate task)",
    });

    const containerSecrets: Record<string, ecs.Secret> = {
      DATABASE_URL: ecs.Secret.fromSecretsManager(secrets.databaseUrl),
      AUTH_SECRET: ecs.Secret.fromSecretsManager(secrets.authSecret),
      AUTH_GOOGLE_ID: ecs.Secret.fromSecretsManager(secrets.googleClientId),
      AUTH_GOOGLE_SECRET: ecs.Secret.fromSecretsManager(secrets.googleClientSecret),
      AUTH_GOOGLE_MOBILE_CLIENT_ID: ecs.Secret.fromSecretsManager(secrets.googleMobileClientId),
    };

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "Service", {
      cluster,
      cpu: config.fargateCpu,
      memoryLimitMiB: config.fargateMemoryLimitMiB,
      desiredCount: config.desiredCount,
      minHealthyPercent: config.minHealthyPercent,
      maxHealthyPercent: config.maxHealthyPercent,
      circuitBreaker: { rollback: true },
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [appSecurityGroup],
      publicLoadBalancer: true,
      taskImageOptions: {
        image,
        containerPort: 3000,
        secrets: containerSecrets,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: "watameta-api",
          logRetention: config.logRetention,
        }),
      },
    });

    // A dedicated liveness endpoint (no auth, no DB) rather than "/", which
    // renders the sign-in page and would tie the health check to auth config.
    service.targetGroup.configureHealthCheck({ path: "/api/health" });

    databaseSecurityGroup.addIngressRule(
      appSecurityGroup,
      ec2.Port.tcp(5432),
      "Watameta API tasks -> RDS",
    );

    if (config.envName === "production") {
      const scaling = service.service.autoScaleTaskCount({
        minCapacity: config.minCapacity,
        maxCapacity: config.maxCapacity,
      });
      scaling.scaleOnCpuUtilization("CpuScaling", { targetUtilizationPercent: 60 });
    }

    const migrateTaskDefinition = new ecs.FargateTaskDefinition(this, "MigrateTaskDefinition", {
      cpu: config.fargateCpu,
      memoryLimitMiB: config.fargateMemoryLimitMiB,
    });
    migrateTaskDefinition.addContainer("Migrate", {
      image,
      command: ["npm", "run", "migrate"],
      secrets: containerSecrets,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "watameta-migrate",
        logRetention: config.logRetention,
      }),
    });

    new CfnOutput(this, "ServiceUrl", {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`,
    });
    new CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new CfnOutput(this, "MigrateTaskDefinitionArn", {
      value: migrateTaskDefinition.taskDefinitionArn,
    });
    new CfnOutput(this, "AppSecurityGroupId", { value: appSecurityGroup.securityGroupId });
    new CfnOutput(this, "AppSubnetIds", {
      value: vpc.privateSubnets.map((subnet) => subnet.subnetId).join(","),
    });
  }
}
