const { httpGet, httpPost, showError, SaveCookies, GetUserData } = require('./helpers')

function initFacebookLogin(win, FB_APP_ID, URL_PREFIX) {

  win.webContents.on('did-navigate', (evt, url) => {
    // intercept login/auth response from facebook
    //url.match(/^https\:\/\/www.facebook.com\/connect\/login_success.html#access_token=([^&$]+)/)
    var access_token = url.match(/\#(?:access_token)\=([\S\s]*?)\&/);
    if (access_token != null) {
      console.log(access_token[1]);
      const token = access_token[1];
      //console.log('🔐  got fb access token:', token)
      // get facebook user id (required by openwhyd api)
      httpGet({ url: `https://graph.facebook.com/me?scope=email&access_token=${token}&fields=first_name,last_name,gender,email&scope=email` }, (err, res) => {
        if (err) showError(err)
        console.log('graph.facebook.com/me =>', err || res)
        const body = {
          FName: res.first_name,
          LName: res.last_name,
          UserName: res.id,
          Email: res.email,
          UserType: "BusinessUserDoctor",
          Gender: res.gender == "male" ? 1 : 2,
          Provider: "Facebook",
          ProviderValue: res.id
        }
        // login to openwhyd using facebook access token and user id
        // cf
        httpPost({ url: `${URL_PREFIX}/api/Account/RegisterExternal` }, body, (err, res) => {
          console.log('facebookLogin =>', err || res)
          if (err) {
            showError(err)
          } else {
            if (typeof res === "object") {
              let cookiesObj = {
                authorization: res.accessTokenResponse.access_token,
                token_type: res.accessTokenResponse.token_type,
                userName: res.accessTokenResponse.userName
              }
              SaveCookies(cookiesObj, URL_PREFIX);
              GetUserData(cookiesObj.userName, URL_PREFIX, () => {
                win.loadURL(`${URL_PREFIX}/WebApp/Clinic/ChangeClinic.aspx`)
              })
            }
          }
        })
      })
    }
  });

  win.webContents.on('new-window', (evt, url) => {
    if (/^https:\/\/www.facebook.com/.test(url)) {
      evt.preventDefault()
      console.log('intercepted facebook connect popup:', url)
      //const redirect = 'https://www.facebook.com/connect/login_success.html'
      const redirect = `${URL_PREFIX}`;
      win.loadURL(`https://www.facebook.com/v2.10/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${redirect}&response_type=token`)
    }
  })
}

exports.initFacebookLogin = initFacebookLogin
