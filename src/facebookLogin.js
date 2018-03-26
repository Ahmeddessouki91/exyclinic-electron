const { httpGet, httpPost, showError, setCookies, getUserData } = require('./helpers')

function initFacebookLogin(win, FB_APP_ID, URL_PREFIX) {

  console.log('🔐  Facebook Login for', { FB_APP_ID, URL_PREFIX })

  win.webContents.on('did-navigate', (evt, url) => {
    // intercept login/auth response from facebook
    if (url.match(/^https\:\/\/www.facebook.com\/connect\/login_success.html#access_token=([^&$]+)/)) {
      const token = RegExp.$1
      //console.log('🔐  got fb access token:', token)
      // get facebook user id (required by openwhyd api)
      httpGet({ url: `https://graph.facebook.com/me?scope=email&access_token=${token}&fields=first_name,last_name,gender,email` }, (err, res) => {
        if (err) showError(err)
        console.log('👱  graph.facebook.com/me =>', err || res)
        const body = {
          FName: res.first_name,
          LName: res.last_name,
          UserName: res.id,
          Email: res.email,
          UserType: Enums.UserType.BusinessUserDoctor,
          Gender: res.gender == "male" ? 1 : 2,
          Provider: "Facebook",
          ProviderValue: res.id
        }
        // login to openwhyd using facebook access token and user id
        // cf
        httpPost({ url: `${URL_PREFIX}/api/Account/RegisterExternal` }, body, (err, FB_res) => {
          console.log('🔐  facebookLogin =>', err || FB_res)
          if (err) {
            showError(err)
            // } else if (!res.redirect) {
            //   showError(res)
            // } else {
            if (FB_res != null
              && FB_res.accessTokenResponse.access_token != undefined && FB_res.accessTokenResponse.access_token != null
              && FB_res.accessTokenResponse.token_type != undefined && FB_res.accessTokenResponse.token_type != null
              && FB_res.accessTokenResponse.expires_in != undefined && FB_res.accessTokenResponse.expires_in != null) {

              let cookiesObj = {
                authorization: FB_res.accessTokenResponse.access_token,
                token_type: FB_res.accessTokenResponse.token_type,
                userName: FB_res.accessTokenResponse.userName
              };
              setCookies(cookiesObj);
              getUserData(FB_res.accessTokenResponse.userName, () => {
                //win.loadURL(`${URL_PREFIX}/WebApp/Clinic/ChangeClinic.aspx`);
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
      console.log('⚡️  intercepted facebook connect popup:', url)
      const redirect = 'https://www.facebook.com/connect/login_success.html'
      win.loadURL(`https://www.facebook.com/v2.10/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${redirect}&response_type=token`)
    }
  })
}

exports.initFacebookLogin = initFacebookLogin
