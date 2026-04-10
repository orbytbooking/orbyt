const AUTHORIZE_NET_SANDBOX_API = "https://apitest.authorize.net/xml/v1/request.api";
const AUTHORIZE_NET_PROD_API = "https://api.authorize.net/xml/v1/request.api";

/** Sandbox unless AUTHORIZE_NET_ENVIRONMENT=production */
export function getAuthorizeNetApiUrl(): string {
  return process.env.AUTHORIZE_NET_ENVIRONMENT === "production" ? AUTHORIZE_NET_PROD_API : AUTHORIZE_NET_SANDBOX_API;
}
