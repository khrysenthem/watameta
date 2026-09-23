import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import type { EnvironmentConfig } from "./config.js";

/**
 * A Postgres instance in the isolated subnet tier — no route in or out of
 * the internet. Only reachable from whatever security group is explicitly
 * granted ingress (the app tier's, wired up in api-construct.ts).
 */
export class DatabaseConstruct extends Construct {
  public readonly instance: rds.DatabaseInstance;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, vpc: ec2.Vpc, config: EnvironmentConfig) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc,
      description: "Watameta RDS instance",
      allowAllOutbound: false,
    });

    this.instance = new rds.DatabaseInstance(this, "Instance", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_17,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      instanceType: config.dbInstanceType,
      multiAz: config.dbMultiAz,
      allocatedStorage: config.dbAllocatedStorageGiB,
      credentials: rds.Credentials.fromGeneratedSecret("watameta"),
      databaseName: "watameta",
      storageEncrypted: true,
      securityGroups: [this.securityGroup],
      backupRetention: config.dbBackupRetention,
      removalPolicy: config.dbRemovalPolicy,
      deletionProtection: config.dbDeletionProtection,
    });
  }
}
