// Handle login on the index page. This file is concatenated with
// index.ts.

interface UserInfo {
  // The typescript definition of user login information.
  givenName: string
  familyName: string
  email: string
  userId: string
  // todo: make this a boolean?
  admin: string // either "true" or "false"
  access_token: string
}

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
  log("login", "logMeIn")

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

  log("login", "login")

  const s = settings

  const [redirect_uri, state] = getRedirectUriAndState()

  const loginUrl = `${s.domain}/oauth2/authorize?client_id=${s.client_id}` +
    `&state=${state}&response_type=code&scope=openid%20profile` +
    `&redirect_uri=${redirect_uri}`
  log("login", loginUrl)

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

  log("login", "cognito logout")

  // The state is not passed back when you use the logout_uri, just redirect_url.

  const logoutUrl = `${s.domain}/logout?client_id=${s.client_id}&logout_uri=${logout_uri}`
  log("login", logoutUrl)

  window.location.assign(logoutUrl)
}


async function processCognitoLogin(state: string) {
  // Handle logging in.  This is called after the cognito login dialog
  // successfully logs in.
  log("login", "processCognitoLogin, state: ${state}")

  if (state == "loggedInTest") {
    // Don't eat the code when logging in from from login-flow.
    log("login", "Login from login-flow.")
    return
  }
  else if (state == "loggedInNormal" || state == "loggedInLocal") {
  }
  else {
    log("login", "Unknown login state")
    return
  }
  
  // Get the code from the url query parameters.
  const code = getSearchParam("code")
  if (!code) {
    log("login", "Missing the code query parameter.")
    return null
  }
  log("login", `code: ${code}`)

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

  log("login", "get user info")

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
      log("login", `Fetching user info failed. Code already used? status: ${response.status}`)
      return null
    }
  }
  catch (error) {
    log("login", `Fetch user info error: ${error}`)
    return null
  }
  const data = await response.json()
  log("login", `token keys: ${Object.keys(data)}`)
  const access_token = data["access_token"]

  // Get the user info from from cognito using the access token.
  const userInfoUrl = `${settings.domain}/oauth2/userInfo`
  const userInfoheaders = new Headers()
  userInfoheaders.append("Content-Type", "application/json")
  userInfoheaders.append("Authorization", `Bearer ${access_token}`)
  const userInfoResponse = await fetch(userInfoUrl, {"headers": userInfoheaders})
  const info = await userInfoResponse.json()
  log("login", `user info from cognito: ${JSON.stringify(info)}`)
  return {
    givenName: info["given_name"],
    familyName: info["family_name"],
    email: info["email"],
    userId: info["username"],
    admin: info["custom:admin"],
    access_token: access_token,
  }
}

function storeUserInfo(userInfo: UserInfo) {
  // Store the user information in local storage.
  log("login", "store user info")
  const userInfoJson = JSON.stringify(userInfo)
  log("login", userInfoJson)
  localStorage.setItem('userInfo', userInfoJson);
}

function clearUserInfo() {
  // Remove the user information from local storage.
  log("login", "clear user info")
  localStorage.removeItem("userInfo")
}

function fetchUserInfo() {
  // Return the user info from local storage or return null when it
  // doesn't exist. The existence of user info means the user is
  // logged in.
  const userInfoJson = localStorage.getItem('userInfo')
  if (userInfoJson == null)
    return null
  return JSON.parse(userInfoJson) as UserInfo;
}

function hasLoggedIn(): boolean {
  // Return true when the user has logged in. Determine this by
  // looking for the user information in local storage.
  return (localStorage.getItem("userInfo")) ? true : false
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

function showUserInformation(userInfo: UserInfo) {
  // Show the user name and a logout button on the page.

  const adminStr = isAdmin(userInfo) ? " (admin)" : ""
  log("login", `${userInfo.givenName} ${userInfo.familyName}${adminStr} is logged in.`)

  get("given-name").textContent = userInfo.givenName
  get("family-name").textContent = userInfo.familyName
  get("admin").style.display = isAdmin(userInfo) ? "inline-block" : "none"
  get("user-info").style.display = "block"

  // Note: the user info is hidden when the user clicks it, see
  // hideUserInformation.
}

function hideUserInformation(element: Element) {
  // Hide the user information from the page.
  log("login", "hide user information")
  get("user-info").style.display = 'none'
}

function logout() {
  // Logout the user. Remove the user details from local storage and
  // tell cognito to logout the user.
  log("login", "logout")
  clearUserInfo()
  updateLoginUI()
  cognitoLogout()
}
