
interface UserInfo {
  // The typescript definition of user login information.
  givenName: string
  familyName: string
  email: string
  userId: string
  // todo: make admin a boolean?
  admin: string // either "true" or "false"
  access_token: string
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

