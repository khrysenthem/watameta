import { Construct } from "constructs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

/**
 * Secrets Manager entries for everything the API needs at runtime, per
 * https://authjs.dev and our own DATABASE_URL convention.
 *
 * AUTH_SECRET can be generated safely with no manual step. DATABASE_URL and
 * the Google OAuth credentials genuinely can't be known at synth time — there
 * is no AWS account to provision against yet, and a Google Cloud OAuth app
 * has to be created out-of-band regardless. Those four are created here as
 * placeholders (Secrets Manager still fills them with *some* random value,
 * since a secret can't be created empty) so the stack is deployable
 * end-to-end; update their values afterwards via the console or
 * `aws secretsmanager put-secret-value`, then restart the ECS service.
 */
export class SecretsConstruct extends Construct {
  public readonly databaseUrl: secretsmanager.Secret;
  public readonly authSecret: secretsmanager.Secret;
  public readonly googleClientId: secretsmanager.Secret;
  public readonly googleClientSecret: secretsmanager.Secret;
  public readonly googleMobileClientId: secretsmanager.Secret;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.databaseUrl = new secretsmanager.Secret(this, "DatabaseUrl", {
      description:
        "postgres://<user>:<password>@<rds-endpoint>:5432/watameta — fill in once the RDS instance exists",
    });

    this.authSecret = new secretsmanager.Secret(this, "AuthSecret", {
      description: "NextAuth AUTH_SECRET — generated, no manual step needed",
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    this.googleClientId = new secretsmanager.Secret(this, "GoogleClientId", {
      description: "Google OAuth client ID (AUTH_GOOGLE_ID) — fill in manually",
    });

    this.googleClientSecret = new secretsmanager.Secret(this, "GoogleClientSecret", {
      description: "Google OAuth client secret (AUTH_GOOGLE_SECRET) — fill in manually",
    });

    this.googleMobileClientId = new secretsmanager.Secret(this, "GoogleMobileClientId", {
      description:
        "Google OAuth mobile/iOS client ID (AUTH_GOOGLE_MOBILE_CLIENT_ID) — fill in manually. " +
        "Not really a secret (Google issues no client secret for this client type) but stored " +
        "here anyway for consistency with how the rest of the API's config is delivered.",
    });
  }
}
