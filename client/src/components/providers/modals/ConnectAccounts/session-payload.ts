/** Credential sources the import flow accepts: the JSON dumps CLI clients write
 *  to disk, and a bare JWT pasted on its own. */

type SessionDump = {
  accessToken?: string
  access_token?: string
  token?: string
  account?: {
    id?: string
    planType?: string
  }
  accountId?: string
  account_id?: string
  user?: {
    id?: string
    email?: string
    name?: string
  }
  name?: string
  sessionToken?: string
  refreshToken?: string
  refresh_token?: string
}

/** OpenAI's own claims on a session token — the only source for the account id
 *  and label when the dump omits them. */
type JwtClaims = {
  email?: string
  "https://api.openai.com/auth"?: {
    chatgpt_account_id?: string
  }
  "https://api.openai.com/profile"?: {
    email?: string
    name?: string
  }
}

export type ParsedSession = {
  accessToken: string
  accountID: string
  refreshToken: string
  name: string
}

function claimsFromToken(token: string): JwtClaims | null {
  const payload = token.split(".")[1]
  if (!payload) return null
  try {
    // atob takes standard base64 only, and JWT payloads are base64url.
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json) as JwtClaims
  } catch {
    return null
  }
}

function identityFromClaims(
  claims: JwtClaims
): Pick<ParsedSession, "accountID" | "name"> {
  const profile = claims["https://api.openai.com/profile"]
  return {
    accountID: claims["https://api.openai.com/auth"]?.chatgpt_account_id ?? "",
    name: profile?.email || claims.email || profile?.name || "",
  }
}

/** The token's claims are the fallback, never the override: a field the dump
 *  already carried stays as it is. */
function withTokenClaims(session: ParsedSession): ParsedSession {
  if (!session.accessToken.includes(".")) return session
  const claims = claimsFromToken(session.accessToken)
  if (!claims) return session

  const { accountID, name } = identityFromClaims(claims)
  return {
    ...session,
    accountID: session.accountID || accountID,
    name: session.name || name,
  }
}

export function parseSessionPayload(text: string): ParsedSession | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // A bare token, not a JSON dump: only a JWT carries its own account claims, so
  // anything else pasted here has no account id to recover.
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    if (!trimmed.startsWith("ey")) return null
    return withTokenClaims({
      accessToken: trimmed,
      accountID: "",
      refreshToken: "",
      name: "",
    })
  }

  let dump: SessionDump
  try {
    dump = JSON.parse(trimmed) as SessionDump
  } catch {
    return null
  }

  const accessToken = dump.accessToken || dump.access_token || dump.token || ""
  if (!accessToken) return null

  const resolvedAccountID =
    dump.account?.id || dump.accountId || dump.account_id || ""

  return withTokenClaims({
    accessToken,
    accountID: resolvedAccountID,
    refreshToken:
      dump.refreshToken || dump.refresh_token || dump.sessionToken || "",
    name: dump.user?.email || dump.user?.name || dump.name || "",
  })
}
