// Handle login on the index page. This file is concatenated with
// index.ts.

// See aws_settings.json. It is created in the cognito.py file.
interface Settings {
  // The typescript definition of [aws_settings.json].
  client_id: string
  redirect_uri: string
  logout_uri: string
  scope: string
  domain: string
  redirect_uri_local: string
  logout_uri_local: string
  pool_name: string
  distribution_id: string
  bucket_name: string
  userPoolId: string
  subscriptions_api_url: string
}

// The settings are defined in the index.html file from data in the
// aws-settings.json file.
var settings: Settings

window.addEventListener("load", updateLoginUI)

function getFirstLetter() {
  // Return the user's first initial of their name.
  let firstLetter = "A"
  const userInfo = fetchUserInfo()
  if (userInfo != null && userInfo.givenName.length > 0)
    firstLetter = userInfo.givenName[0]
  return firstLetter
}

function updateLoginUI() {
  // Update the UI to reflect the current login state.
  if (hasLoggedIn()) {
    get("first-letter").textContent = getFirstLetter()
    get("login-me-in").style.display = "none"
    get("first-letter").style.display = "flex"
  }
  else {
    get("login-me-in").style.display = "block"
    get("first-letter").style.display = "none"
  }
  showHideAdminUI("index")
}

function logMeIn() {
  // Login or show the user information.
  log("logMeIn")

  const userInfo = fetchUserInfo()
  if (userInfo)
    showUserInformation(userInfo)
  else
    logIn()
}

function getRedirectUriAndState() {
  // Return the redirect_uri and state for use with cognito.
  let state: string
  let redirect_uri: string
  if (window.location.hostname == "localhost") {
    state = "loggedInLocal"
    redirect_uri =  settings.redirect_uri_local
  }
  else {
    state = "loggedInNormal"
    redirect_uri = settings.redirect_uri
  }
  return [redirect_uri, state]
}

function logIn() {
  // Login the user using the AWS cognito login UI.  After the user
  // logs in it will jump to the index page URL passing the state
  // variable.  The state variable determines what happens next. See
  // processCognitoLogin.

  log("login")

  const s = settings

  const [redirect_uri, state] = getRedirectUriAndState()

  const loginUrl = `${s.domain}/oauth2/authorize?client_id=${s.client_id}` +
    `&state=${state}&response_type=code&scope=${s.scope}` +
    `&redirect_uri=${redirect_uri}`
  log(loginUrl)

  // Login by jumping to the AWS cognito UI.
  window.location.assign(loginUrl)
}

function cognitoLogout() {
  // Log out of cognito.

  const s = settings

  let logout_uri = ""
  if (window.location.hostname == "localhost")
    logout_uri = s.logout_uri_local
  else
    logout_uri = s.logout_uri

  log("cognito logout")

  // The state is not passed back when you use the logout_uri, just redirect_url.

  const logoutUrl = `${s.domain}/logout?client_id=${s.client_id}&logout_uri=${logout_uri}`
  log(logoutUrl)

  window.location.assign(logoutUrl)
}


async function processCognitoLogin(state: string) {
  // Handle logging in.  This is called after the cognito login dialog
  // successfully logs in.
  log("processCognitoLogin, state: ${state}")

  if (state == "loggedInTest") {
    // Don't eat the code when logging in from from login-flow.
    log("Login from login-flow.")
    return
  }
  else if (state == "loggedInNormal" || state == "loggedInLocal") {
  }
  else {
    log("Unknown login state")
    return
  }
  
  // Get the code from the url query parameters.
  const code = getSearchParam("code")
  if (!code) {
    log("Missing the code query parameter.")
    return null
  }
  log(`code: ${code}`)

  // Get the user information and store it in local storage.
  const userInfo = await getUserInfo(code)
  if (userInfo) {
    storeUserInfo(userInfo)
    updateLoginUI()
  }
  else {
    // Redirect to index.
    window.location.assign("index.html")
  }
}

async function getUserInfo(code: string): Promise<UserInfo | null> {
  // Get the user information from AWS congnito given the cognito
  // login code.

  log("get user info")

  // Fetch the user information from cognito.
  // https://docs.aws.amazon.com/cognito/latest/developerguide/userinfo-endpoint.html
  // the /oauth2/userInfo endpoint

  const tokenUrl = `${settings.domain}/oauth2/token`
  const [redirect_uri, state] = getRedirectUriAndState()
  const bodyText = `grant_type=authorization_code&client_id=${settings.client_id}` +
    `&redirect_uri=${redirect_uri}&code=${code}`

  // Post url to get the access token.
  let response
  const headers = new Headers();
  headers.append("Content-Type", "application/x-www-form-urlencoded");
  try {
    response = await fetch(tokenUrl, {
      "method": "POST",
      "body": bodyText,
      "headers": headers,
    })
    if (!response.ok) {
      // You can only use the code once, so this error happens when
      // you reload a page with state=loggedIn.
      log(`Fetching user info failed. Code already used? status: ${response.status}`)
      return null
    }
  }
  catch (error) {
    log(`Fetch user info error: ${error}`)
    return null
  }
  const data = await response.json()
  log(`token keys: ${Object.keys(data)}`)
  const access_token = data["access_token"]

  // Get the user info from from cognito using the access token.
  const userInfoUrl = `${settings.domain}/oauth2/userInfo`
  const userInfoheaders = new Headers()
  userInfoheaders.append("Content-Type", "application/json")
  userInfoheaders.append("Authorization", `Bearer ${access_token}`)
  const userInfoResponse = await fetch(userInfoUrl, {"headers": userInfoheaders})
  const info = await userInfoResponse.json()
  log(`user info from cognito: ${JSON.stringify(info)}`)
  return {
    givenName: info["given_name"],
    familyName: info["family_name"],
    email: info["email"],
    userId: info["username"],
    admin: info["custom:admin"],
    access_token: access_token,
    refresh_token: data["refresh_token"],
    access_token_expires_at: tokenExpiresAt(access_token, data["expires_in"]),
  }
}

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60 * 1000

let refreshAccessTokenPromise: Promise<UserInfo | null> | null = null

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
    handleExpiredSession()
    return null
  }

  const tokenUrl = `${settings.domain}/oauth2/token`
  const bodyText = `grant_type=refresh_token&client_id=${settings.client_id}` +
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
    handleExpiredSession()
    return null
  }

  if (!response.ok) {
    log(`Refresh access token failed: ${response.status}`)
    handleExpiredSession()
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

function handleExpiredSession() {
  // Clear stored login state when tokens can no longer be refreshed.
  clearUserInfo()
  updateLoginUI()
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
  localStorage.removeItem("notificationsOn")
  localStorage.removeItem("notificationsVapidPublicKey")
}

function hasLoggedIn(): boolean {
  // Return true when the user has logged in. Determine this by
  // looking for the user information in local storage.
  return (localStorage.getItem("userInfo")) ? true : false
}

function showUserInformation(userInfo: UserInfo) {
  // Show the user name and a logout button on the page.

  const adminStr = isAdmin(userInfo) ? "-- admin" : ""
  log(`${userInfo.givenName} ${userInfo.familyName} is logged in.`)
  log(`admin: ${isAdmin(userInfo) ? "yes" : "no"}`)
  log(`user id: ${userInfo.userId}`)
  log(`email: ${userInfo.email}`)

  get("given-name").textContent = userInfo.givenName
  get("family-name").textContent = userInfo.familyName
  get("admin").textContent = adminStr
  get("user-info").style.display = "block"

  // Note: the user info is hidden when the user clicks it, see
  // hideUserInformation.
}

function hideUserInformation(element: Element) {
  // Hide the user information from the page.
  log("hide user information")
  get("user-info").style.display = 'none'
}

function logout() {
  // Logout the user. Remove the user details from local storage and
  // tell cognito to logout the user.
  log("logout")
  clearUserInfo()
  updateLoginUI()
  cognitoLogout()
}
