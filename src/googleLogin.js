const { httpGet, httpPost, showError, SaveCookies, GetUserData } = require('./helpers')

function initGoogleLogin(win, FB_APP_ID, URL_PREFIX) {

    console.log('Google Login for', { FB_APP_ID, URL_PREFIX })
  
    win.webContents.on('did-navigate', (evt, url) => {
      // intercept login/auth response from Google
      if (url.match(/^https\:\/\/www.Google.com\/connect\/login_success.html#access_token=([^&$]+)/)) {
        const token = RegExp.$1
        //console.log('🔐  got fb access token:', token)
        // get Google user id (required by openwhyd api)
        httpGet({ url: `https://graph.Google.com/me?scope=email&access_token=${token}&fields=first_name,last_name,gender,email&scope=email` }, (err, res) => {
          if (err) showError(err)
          console.log('graph.Google.com/me =>', err || res)
          const body = {
            FName: res.first_name,
            LName: res.last_name,
            UserName: res.id,
            Email: res.email,
            UserType: "BusinessUserDoctor",
            Gender: res.gender == "male" ? 1 : 2,
            Provider: "Google",
            ProviderValue: res.id
          }
          // login to openwhyd using Google access token and user id
          // cf
          httpPost({ url: `${URL_PREFIX}/api/Account/RegisterExternal` }, body, (err, res) => {
            console.log('GoogleLogin =>', err || res)
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
            // TODO: better handle errors from res.result, e.g. 'nok, user id=510739408 not found in db'
          })
        })
      }
    })
  
    win.webContents.on('new-window', (evt, url) => {
      if (/^https:\/\/www.Google.com/.test(url)) {
        evt.preventDefault()
        console.log('⚡️  intercepted Google connect popup:', url)
        const redirect = 'https://www.Google.com/connect/login_success.html'
        win.loadURL(`https://www.Google.com/v2.10/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${redirect}&response_type=token`)
      }
    })
  }
  
  exports.initGoogleLogin = initGoogleLogin