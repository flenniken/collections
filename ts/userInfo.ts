
interface UserInfo {
  // The typescript definition of user login information.
  givenName: string
  familyName: string
  email: string
  userId: string
  // todo: make admin a boolean?
  admin: string // either "true" or "false"
  access_token: string
  refresh_token?: string
  access_token_expires_at?: number
}

interface CognitoAuth {
  // Cognito settings needed to refresh an access token from any page.
  domain: string
  client_id: string
}

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60 * 1000

let refreshAccessTokenPromise: Promise<UserInfo | null> | null = null

function fetchUserInfo() {
  // Return the user info from local storage or return null when it
  // doesn't exist. The existence of user info means the user is
  // logged in.
  const userInfoJson = localStorage.getItem('userInfo')
  if (userInfoJson == null)
    return null
  return JSON.parse(userInfoJson) as UserInfo;
}

function storeUserInfo(userInfo: UserInfo) {
  // Store the user information in local storage.
  log("store user info")
  const userInfoJson = JSON.stringify(userInfo)
  log(userInfoJson)
  localStorage.setItem('userInfo', userInfoJson);
}

function clearUserInfo() {
  // Remove the user information from local storage.
  log("clear user info")
  localStorage.removeItem("userInfo")
  localStorage.removeItem("cognitoAuth")
  localStorage.removeItem("notificationsOn")
  localStorage.removeItem("notificationsVapidPublicKey")
}

function hasLoggedIn(): boolean {
  // Return true when the user has logged in. Determine this by
  // looking for the user information in local storage.
  return (localStorage.getItem("userInfo")) ? true : false
}

function storeCognitoAuth(domain: string, clientId: string) {
  // Save the Cognito settings used to refresh tokens on pages that
  // do not embed aws-settings.json, for example the image page.
  const auth: CognitoAuth = { domain: domain, client_id: clientId }
  localStorage.setItem("cognitoAuth", JSON.stringify(auth))
}

function fetchCognitoAuth(): CognitoAuth | null {
  const json = localStorage.getItem("cognitoAuth")
  if (json == null)
    return null
  return JSON.parse(json) as CognitoAuth
}

function isAdmin(userInfo?: UserInfo): boolean {
  // Return true when the user has logged in and is an admin. UserInfo
  // is fetched when not passed in.
  let uinfo
  if (typeof userInfo === 'undefined')
    uinfo = fetchUserInfo()
  else
    uinfo = userInfo
  if (uinfo != null && uinfo.admin == 'true')
    return true
  return false
}

function tokenExpiresAt(access_token: string, expires_in?: number): number | undefined {
  // Return when the access token expires (epoch ms).
  if (typeof expires_in === "number")
    return Date.now() + expires_in * 1000
  return accessTokenExpFromJwt(access_token) ?? undefined
}

function accessTokenExpFromJwt(access_token: string): number | null {
  // Read the exp claim from a JWT access token.
  try {
    const part = access_token.split('.')[1]
    const padding = '='.repeat((4 - part.length % 4) % 4)
    const base64 = (part + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    if (typeof payload.exp === "number")
      return payload.exp * 1000
  } catch {
  }
  return null
}

function accessTokenExpiresAt(userInfo: UserInfo): number | null {
  if (userInfo.access_token_expires_at)
    return userInfo.access_token_expires_at
  return accessTokenExpFromJwt(userInfo.access_token)
}

function isAccessTokenExpired(userInfo: UserInfo): boolean {
  const expiresAt = accessTokenExpiresAt(userInfo)
  if (!expiresAt)
    return false
  return Date.now() >= expiresAt - ACCESS_TOKEN_REFRESH_BUFFER_MS
}

async function refreshAccessToken(userInfo: UserInfo): Promise<UserInfo | null> {
  // Get a new access token using the Cognito refresh token.
  if (!userInfo.refresh_token) {
    log("No refresh token stored, user must log in again")
    clearUserInfo()
    return null
  }

  const auth = fetchCognitoAuth()
  if (!auth) {
    log("No Cognito auth settings stored, user must log in again")
    clearUserInfo()
    return null
  }

  const tokenUrl = `${auth.domain}/oauth2/token`
  const bodyText = `grant_type=refresh_token&client_id=${auth.client_id}` +
    `&refresh_token=${encodeURIComponent(userInfo.refresh_token)}`

  const headers = new Headers()
  headers.append("Content-Type", "application/x-www-form-urlencoded")

  let response
  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      body: bodyText,
      headers: headers,
    })
  } catch (error) {
    log(`Refresh access token error: ${error}`)
    clearUserInfo()
    return null
  }

  if (!response.ok) {
    log(`Refresh access token failed: ${response.status}`)
    clearUserInfo()
    return null
  }

  const data = await response.json()
  const updated: UserInfo = {
    ...userInfo,
    access_token: data["access_token"],
    access_token_expires_at: tokenExpiresAt(data["access_token"], data["expires_in"]),
  }
  if (data["refresh_token"])
    updated.refresh_token = data["refresh_token"]

  storeUserInfo(updated)
  log("Access token refreshed")
  return updated
}

async function ensureValidAccessToken(): Promise<UserInfo | null> {
  // Return user info with a valid access token, refreshing when needed.
  const userInfo = fetchUserInfo()
  if (!userInfo)
    return null
  if (!isAccessTokenExpired(userInfo))
    return userInfo

  log("Access token expired, refreshing")
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = refreshAccessToken(userInfo).finally(() => {
      refreshAccessTokenPromise = null
    })
  }
  return refreshAccessTokenPromise
}
