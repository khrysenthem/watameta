# Watameta — AWS CDK

Deploys the API (the root `Dockerfile`) to two environments — `WatametaDevelopment`
and `WatametaProduction` — each with its own VPC, RDS Postgres instance, and
ECS Fargate service behind an Application Load Balancer.

This has only ever been validated with `cdk synth` and the assertion tests in
`test/` — **it has never been `cdk deploy`'d against a real AWS account**.
Treat it as a solid starting point to sanity-check once real credentials
exist, not as a proven-in-production template.

## Architecture

Per environment:

- **VPC** (`lib/network-construct.ts`): 2 AZs x 3 subnet tiers — `public`
  (the load balancer), `app` (Fargate tasks, egress via NAT for pulling the
  image and reaching Google's OAuth endpoints), `data` (RDS, fully isolated —
  no route in or out of the internet at all).
- **RDS** (`lib/database-construct.ts`): Postgres 17, encrypted at rest, in
  the isolated tier. Its security group only accepts inbound 5432 from the
  app tier's security group.
- **Secrets** (`lib/secrets-construct.ts`): four Secrets Manager entries —
  `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — see
  [Manual steps after deploying](#manual-steps-after-deploying) below.
- **API** (`lib/api-construct.ts`): an ECS cluster running an
  `ApplicationLoadBalancedFargateService` built from the repo root
  `Dockerfile`, health-checked at `/api/health`. A second, standalone task
  definition runs the same image with `npm run migrate` instead of starting
  the server — see [Running migrations](#running-migrations).

`lib/config.ts` holds the only differences between the two environments:
NAT gateway count, instance/task sizing, Multi-AZ, deletion protection,
autoscaling bounds, and log retention. Development is sized to be cheap and
disposable (`RemovalPolicy.DESTROY`, no deletion protection, a single NAT
gateway, a single Fargate task); production favors availability (Multi-AZ,
deletion protection, 2+ tasks across AZs, autoscaling on CPU).

## Prerequisites

- An AWS account and credentials configured locally (`aws configure`, or an
  SSO profile) — **not available at the time this was written**.
- The account bootstrapped for CDK: `npx cdk bootstrap`.
- Docker running locally (`cdk synth`/`cdk deploy` builds the API image via
  `ecs.ContainerImage.fromAsset`).

## Commands

The CDK app only ever defines *one* environment's stack at a time, chosen via
the `env` context value — so a bare `cdk deploy` can't touch the wrong one.
`npm install`, then:

```
npm run synth:dev    # or synth:prod — generate CloudFormation, no AWS calls
npm run diff:dev     # or diff:prod  — compare against what's currently deployed
npm run deploy:dev   # or deploy:prod
npm test             # assertion tests against the synthesized templates
```

These map to `cdk <command> -c env=development|production`; pass that same
`-c env=...` flag directly if you need a raw `cdk` command not covered above
(e.g. `npx cdk destroy -c env=development`). `cdk bootstrap` is account/region-level,
not stack-specific, so it doesn't take `-c env`.

`synth:*`/`test` work with zero AWS credentials — they never call the AWS
API, only build the Docker image locally and render CloudFormation.
`deploy:*`/`diff:*` need real credentials.

## Manual steps after deploying

Secrets Manager can't hold an empty secret, so `DATABASE_URL`,
`AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` are created with a throwaway
placeholder value. `AUTH_SECRET` is the one exception — it's just a random
signing key, so it's auto-generated and needs no manual step.

After the first deploy, for each environment:

1. **`DATABASE_URL`**: read the RDS instance's auto-generated credentials
   secret (`Database/Instance/Secret` in the stack, holds `username`/
   `password`) and the instance's endpoint (a stack output), then write the
   assembled connection string to the `DatabaseUrl` secret:
   ```
   aws secretsmanager put-secret-value \
     --secret-id <DatabaseUrl secret ARN> \
     --secret-string "postgres://<user>:<password>@<rds-endpoint>:5432/watameta"
   ```
2. **`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`**: create a Google Cloud OAuth
   client (console.cloud.google.com → APIs & Services → Credentials),
   authorized redirect URI `http://<ServiceUrl output>/api/auth/callback/google`,
   then `put-secret-value` each one.
3. Force a new deployment so the running tasks pick up the new values:
   `aws ecs update-service --cluster <ClusterName> --service <service name> --force-new-deployment`.

## Running migrations

RDS lives in the isolated subnet tier — nothing outside the VPC can reach it,
including your laptop. Migrations run as a one-off ECS task instead, reusing
the same image with `npm run migrate` as the command
(`Api/MigrateTaskDefinition`). The stack outputs everything `run-task` needs:

```
aws ecs run-task \
  --cluster <ClusterName output> \
  --task-definition <MigrateTaskDefinitionArn output> \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<AppSubnetIds output, comma-separated>],securityGroups=[<AppSecurityGroupId output>]}"
```

Do this once after `DATABASE_URL` has a real value, and again after any
schema change.
