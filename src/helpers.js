const { net, dialog, session } = require('electron')

function httpReq(options, data, callback) {
  const req = net.request(options)
  req.on('response', (res) => {
    let rawData = ''
    res.setEncoding('utf8')
    res.on('data', (chunk) => { rawData += chunk })
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData)
        callback(null, parsedData)
      } catch (e) {
        callback(e)
      }
    })
  })
  if (typeof data === 'object') {
    let token = GetToken();
    if (token)
      req.setHeader('authorization', token);
    req.setHeader('Content-Type', 'application/json')
    data = JSON.stringify(data)
  } else if (typeof data === 'string') {
    req.setHeader('Content-Type', 'application/x-www-form-urlencoded')
  }
  req.end(data)
  return req
}

function httpGet(options, callback) {
  return httpReq(options, null, callback)
}

function httpPost(options, data, callback) {
  return httpReq(Object.assign({ method: 'post' }, options), data, callback)
}

function showError(err) {
  dialog.showMessageBox({ type: 'error', message: err.message || JSON.stringify(err) })
}

function SaveCookies(cookiesObj, url) {
  if (cookiesObj != null) {
    for (let cookie in cookiesObj) {
      session.defaultSession.cookies.set({ url: url, name: cookie, value: cookiesObj[cookie] }, (error) => {
        if (error) console.error(error)
      });
    }
    // session.defaultSession.cookies.get({ url: url }, (error, cookies) => {
    //   console.log(cookies);
    // });
  }
}

function GetToken() {
  let authorizationToken = null;
  session.defaultSession.cookies.get({ name: "authorization" }, (error, authToken) => {
    if (error) { console.log(error); return; }
    session.defaultSession.cookies.get({ name: "token_type" }, (error, tokenType) => {
      authorizationToken = tokenType + " " + authToken;
    });
  });
  console.log("Auth: " + authorizationToken);
  return authorizationToken;
}

function GetUserData(username, url, callback) {
  httpGet({ url: `${url}/api/Account/GetUserData?userName=${username}` }, (req, res) => {
    //win.loadURL(URL_PREFIX + res.redirect)
    console.log("UserData", res);
    if (typeof res === "object") {
      let cooikes = {
        DefaultId: res.DefaultId,
        userRole: res.userRole,
        userDisplayName: res.userDisplayName,
        userCode: res.userCode,
        Clinic_FK: res.Clinic_FK,
        readPermission: JSON.stringify(res.readPermission),
        ClinicAdmin_FK: res.clinicAdmin_FK,
        photo_FK: res.photo
      };
      SaveCookies(cooikes, url);
      if (callback) {
        callback();
      }
    }

  });
}
module.exports = {
  httpGet,
  httpPost,
  showError,
  SaveCookies,
  GetUserData
}