// Handle login on the index page. This file is concatenated with
// index.ts.

interface UserInfo {
  // The typescript definition of user login information.
  givenName: string
  familyName: string
  email: string
  userId: string
  admin: string // either "true" or "false"
  token: string
}

window.onload = function() {

  // Update the login state on load.
  updateLoginUI()

  // Define on click event handler on the document.
  document.onclick = function(event: Event) {
    // Hide the user info if the user clicks something besides the
    // login buttons. The button will handle show / hide themself.
    const loginIds = ['logout', 'login-or-out', 'first-letter']
    const id = (<HTMLElement>event.target).id
    log(`on click target id: ${id}`)
    if (loginIds.includes(id))
      return
    hideUserInformation()
  }
}

function getFirstLetter() {
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
    get("login-or-out").style.display = "none"
    get("first-letter").style.display = "flex"
  }
  else {
    get("login-or-out").style.display = "block"
    get("first-letter").style.display = "none"
  }
}

function loginOrOut() {
  // Login or logout the user.
  log("loginOrOut")

  // If logged in, show the user name and logout button, else login.
  if (hasLoggedIn()) {
    log("Already logged in.")
    if (get("user-info").style.display != 'block') {
      const userInfo = fetchUserInfo()
      if (userInfo == null) {
        log("The user is not logged in.")
        return
      }
      showUserInformation(userInfo)
    }
    else
      hideUserInformation()
  }
  else {
    logIn()
  }
}

function logIn() {
  // Log in the user using the AWS cognito login UI.  After the user
  // logs in it will jump to the index page URL passing
  // state=loggedIn and loggedIn will be called.

  log("login")

  // todo: use template to add the info from the docker cognito-config.jsonfile.
  // login-flow -l shows this url
  const loginUrl = "https://pool42613626.auth.us-west-2.amazoncognito.com/oauth2/authorize?client_id=59nnrgfelhidaqhdkrdcnocait&state=loggedIn&response_type=code&scope=openid%20profile&redirect_uri=https://collections.flenniken.net/index.html"
  log(loginUrl)

  // Login by jumping to the AWS congnito UI.
  window.location.assign(loginUrl)
}

async function loggedIn() {
  // The user just logged in. Get the user information and store it in
  // local storage.

  log("loggedIn")

  // Get the code from the url query parameters.
  const searchParams = new URLSearchParams(window.location.search)
  const code = searchParams.get("code")
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
  else
    // Redirect to index.
    window.location.assign("index.html")
}

async function getUserInfo(code: string): Promise<UserInfo | null> {
  // Get the user details from AWS congnito. The code comes from
  // cognito login UI.

  log("getUserInfo")

  // Fetch the user information.
  // https://docs.aws.amazon.com/cognito/latest/developerguide/userinfo-endpoint.html
  // todo: use template to fill this in.
  const domain = "https://pool42613626.auth.us-west-2.amazoncognito.com"
  const url = `${domain}/oauth2/token`

  // why is there a redirect parameter in this post?
  // todo: use template to fill in this
  const bodyText = `grant_type=authorization_code&client_id=59nnrgfelhidaqhdkrdcnocait&redirect_uri=https://collections.flenniken.net/index.html&code=${code}`

  let response
  const headers = new Headers();
  headers.append("Content-Type", "application/x-www-form-urlencoded");
  try {
    response = await fetch(url, {
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
  const userInfoUrl = `${domain}/oauth2/userInfo`
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
    token: "",
  }
}

function storeUserInfo(userInfo: UserInfo) {
  // Store the user information in local storage.
  log("storeUserInfo")
  const userInfoJson = JSON.stringify(userInfo)
  log(userInfoJson)
  localStorage.setItem('userInfo', userInfoJson);
}

function removeUserInfo() {
  // Remove the user information in local storage.
  localStorage.removeItem("userInfo")
  localStorage.clear() // todo: remove this so we can store other things.
}

function fetchUserInfo() {
  // Return the user info from local storage or return null when it
  // doesn't exist.
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

function showUserInformation(userInfo: UserInfo) {
  // Show the user name and a logout button on the page.

  let adminStr = ""
  if (userInfo.admin == "true")
    adminStr = " (admin)"
  log(`${userInfo.givenName} ${userInfo.familyName}${adminStr} is logged in.`)

  get("given-name").textContent = userInfo.givenName
  get("family-name").textContent = userInfo.familyName
  get("user-info").style.display = "block"
  // Note: the user info is hidden when the user clicks
  // something besides logout, see onload.
}

function hideUserInformation() {
  // Hide the user name and logout button.
  log("hide user details")
  get("user-info").style.display = 'none'
}

function logout() {
  // Logout the user. Remove the user details from local storage.
  log("logout")
  removeUserInfo()
  hideUserInformation()
  updateLoginUI()
}

