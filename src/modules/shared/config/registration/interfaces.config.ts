export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string; // this is the database name
  ssl: {
    rejectUnauthorized: boolean;
    require: boolean;
  };
  url: string;
}

export interface MailConfig {
  mailgun: {
    domain: string;
    apiKey: string;
    from: {
      email: string;
      name: string;
    };
  };
  resendInterval: number;
}

export interface AuthConfig {
  jwt: {
    secret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
  admin: {
    email: string;
    password: string;
  };
  apiKey: string;
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
}

export interface OthersConfig {
  frontendUrl: string;
  allowsSandbox: boolean;
  allowedDomains: string;
  requireSignupWithReferral: boolean;
  referralCodeMaximumUsage: number;
  defaultRole: string;
  require2FA: boolean;
}

export interface ServerConfig {
  sessionSecret: string;
  host: string;
  port: number;
  serverUrl: string;
}
