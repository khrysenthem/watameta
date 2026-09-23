import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from "aws-cdk-lib/aws-logs";

export interface EnvironmentConfig {
  envName: "development" | "production";

  /** One NAT gateway per AZ is the highly-available default; dev only needs one to keep cost down. */
  natGateways: number;

  dbInstanceType: ec2.InstanceType;
  dbMultiAz: boolean;
  dbAllocatedStorageGiB: number;
  dbBackupRetention: Duration;
  /** DESTROY makes teardown painless in dev; RETAIN protects real data in prod. */
  dbRemovalPolicy: RemovalPolicy;
  dbDeletionProtection: boolean;

  fargateCpu: number;
  fargateMemoryLimitMiB: number;
  desiredCount: number;
  minCapacity: number;
  maxCapacity: number;
  /** Rolling-deployment capacity bounds; see api-construct.ts. */
  minHealthyPercent: number;
  maxHealthyPercent: number;

  logRetention: logs.RetentionDays;
}

export const developmentConfig: EnvironmentConfig = {
  envName: "development",
  natGateways: 1,
  dbInstanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
  dbMultiAz: false,
  dbAllocatedStorageGiB: 20,
  dbBackupRetention: Duration.days(1),
  dbRemovalPolicy: RemovalPolicy.DESTROY,
  dbDeletionProtection: false,
  fargateCpu: 256,
  fargateMemoryLimitMiB: 512,
  desiredCount: 1,
  minCapacity: 1,
  maxCapacity: 1,
  minHealthyPercent: 0,
  maxHealthyPercent: 200,
  logRetention: logs.RetentionDays.ONE_WEEK,
};

export const productionConfig: EnvironmentConfig = {
  envName: "production",
  natGateways: 2,
  dbInstanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL),
  dbMultiAz: true,
  dbAllocatedStorageGiB: 50,
  dbBackupRetention: Duration.days(7),
  dbRemovalPolicy: RemovalPolicy.RETAIN,
  dbDeletionProtection: true,
  fargateCpu: 512,
  fargateMemoryLimitMiB: 1024,
  desiredCount: 2,
  minCapacity: 2,
  maxCapacity: 4,
  minHealthyPercent: 100,
  maxHealthyPercent: 200,
  logRetention: logs.RetentionDays.ONE_MONTH,
};
