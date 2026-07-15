// LinkedIn API client.
//
// OAuth 2.0 authorization-code flow → we get an access token good for 60 days
// and a refresh token good for 365. We store both in DynamoDB per user.
//
// Docs: https://learn.microsoft.com/en-us/linkedin/consumer/context

import {
  getIntegration,
  saveIntegration,
  type LinkedInIntegration,
} from "./integrations";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const ME_URL = "https://api.linkedin.com/v2/userinfo";
const UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";

// Scopes we need. openid + profile give us the user's LinkedIn person URN
// (via /v2/userinfo). w_member_social lets us post on their behalf.
const SCOPES = ["openid", "profile", "w_member_social"];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export function buildAuthorizeUrl(state: string): string {
  const clientId = requireEnv("LINKEDIN_CLIENT_ID");
  const redirectUri = requireEnv("LINKEDIN_REDIRECT_URI");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES.join(" "),
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: requireEnv("LINKEDIN_CLIENT_ID"),
    client_secret: requireEnv("LINKEDIN_CLIENT_SECRET"),
    redirect_uri: requireEnv("LINKEDIN_REDIRECT_URI"),
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${errText}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchPersonUrn(accessToken: string): Promise<string> {
  const res = await fetch(ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`LinkedIn /userinfo failed (${res.status})`);
  }
  const data = (await res.json()) as { sub: string };
  // LinkedIn's OIDC sub is the member ID; the URN is urn:li:person:<sub>
  return `urn:li:person:${data.sub}`;
}

export async function connectLinkedIn(
  userEmail: string,
  code: string,
): Promise<LinkedInIntegration> {
  const tok = await exchangeCodeForToken(code);
  const personUrn = await fetchPersonUrn(tok.accessToken);
  const record: LinkedInIntegration = {
    provider: "linkedin",
    accessToken: tok.accessToken,
    refreshToken: tok.refreshToken,
    expiresAt: Date.now() + tok.expiresIn * 1000,
    personUrn,
    scopes: SCOPES,
  };
  await saveIntegration(userEmail, record);
  return record;
}

export async function postToLinkedIn(
  userEmail: string,
  text: string,
): Promise<{ postUrn: string }> {
  const integ = await getIntegration(userEmail, "linkedin");
  if (!integ) {
    throw new Error(
      "LinkedIn isn't connected. Connect it in Settings first.",
    );
  }
  if (integ.expiresAt < Date.now()) {
    throw new Error(
      "LinkedIn access token expired. Reconnect LinkedIn in Settings.",
    );
  }
  const body = {
    author: integ.personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };
  const res = await fetch(UGC_POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${integ.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LinkedIn post failed (${res.status}): ${errText}`);
  }
  const postUrn =
    res.headers.get("x-restli-id") ??
    res.headers.get("X-RestLi-Id") ??
    "";
  return { postUrn };
}
