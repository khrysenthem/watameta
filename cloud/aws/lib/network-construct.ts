import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import type { EnvironmentConfig } from "./config.js";

/**
 * A fresh VPC per environment: a public tier for the load balancer, a
 * private-with-egress tier for the Fargate tasks (need outbound access to
 * pull the image and reach Google's OAuth endpoints), and a private-isolated
 * tier for RDS (no route to the internet at all, in or out).
 */
export class NetworkConstruct extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, config: EnvironmentConfig) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: config.natGateways,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "app",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "data",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });
  }
}
