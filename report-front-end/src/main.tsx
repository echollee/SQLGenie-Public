// main.tsx
import "@cloudscape-design/global-styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import {Provider} from "react-redux";
import "regenerator-runtime/runtime";
import Login from "./components/Login";
import {
    AUTH_WITH_OIDC,
    AUTH_WITH_COGNITO,
    LOGIN_TYPE,
    AUTH_WITH_SSO,
    AUTH_WITH_AZUREAD,
    AUTH_WITH_FEISHU,
    AUTH_WITH_NOTHING, FEISHU_APP_ID, BACKEND_URL,
    COGNITO_USER_PWD,
} from "./utils/constants";
import {Storage} from "./utils/helpers/storage";
import userReduxStore from "./utils/helpers/store";
import {Amplify, Auth} from "aws-amplify";
import {awsConfig} from "./components/Login/AuthWithFeishu/aws-config.ts";
import AuthManager from "./components/Login/AuthWithFeishu/AuthManager.ts";

const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
);

const theme = Storage.getTheme();
Storage.applyTheme(theme);
const density = Storage.getDensity();
Storage.applyDensity(density);
console.log("Authentication/Login type: ", LOGIN_TYPE);

let rootComponent = <Login.Custom/>;

if (AUTH_WITH_COGNITO) {
    rootComponent = <Login.Cognito/>;
}
if (AUTH_WITH_OIDC) {
    rootComponent = <Login.Oidc/>;
}
if (AUTH_WITH_SSO) {
    rootComponent = <Login.Sso/>;
}
if (AUTH_WITH_AZUREAD) {
    rootComponent = <Login.AzureAd/>;
}

function loadScript(src, onload) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = onload;
    script.onerror = () => console.error(`Failed to load script: ${src}`);
    document.head.appendChild(script);
}

async function handleSignIn(username: string) {
    try {
        const user = await Auth.signIn(username, COGNITO_USER_PWD); // Wait for sign-in to complete
        console.log("Sign-in successful:", user);
        return user
    } catch (error) {
        console.error("Error during sign-in:", error);
    }
}

if (AUTH_WITH_FEISHU) {
    const script0 = document.createElement('script');
    script0.type = 'text/javascript';
    script0.async = false;
    script0.src = 'https://cdn.staticfile.org/jquery/1.10.2/jquery.min.js';
    document.head.appendChild(script0);

    const script1 = document.createElement('script');
    script1.type = 'text/javascript';
    script1.async = false;
    script1.src = 'https://unpkg.com/vconsole/dist/vconsole.min.js';
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.type = 'text/javascript';
    script2.async = false;
    script2.src = 'https://dhsso.s3.cn-north-1.amazonaws.com.cn/js/vconsole.js';
    document.head.appendChild(script2);

    rootComponent = <Login.Feishu/>;
}

if (AUTH_WITH_NOTHING) {
    const script0 = document.createElement('script');
    script0.type = 'text/javascript';
    script0.async = false;
    script0.src = 'https://cdn.staticfile.org/jquery/1.10.2/jquery.min.js';
    document.head.appendChild(script0);

    const script1 = document.createElement('script');
    script1.type = 'text/javascript';
    script1.async = false;
    script1.src = 'https://unpkg.com/vconsole/dist/vconsole.min.js';
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.type = 'text/javascript';
    script2.async = false;
    script2.src = 'https://dhsso.s3.cn-north-1.amazonaws.com.cn/js/vconsole.js';
    document.head.appendChild(script2);

    loadScript('https://lf1-cdn-tos.bytegoofy.com/goofy/lark/op/h5-js-sdk-1.5.33.js', () => {
        if (!window.h5sdk) {
            alert('H5 SDK failed to initialize');
        } else {
            console.log('H5 SDK loaded');
            window.h5sdk.ready(function () {
                tt.requestAccess({
                    appID: FEISHU_APP_ID,
                    scopeList: [],
                    async success(res: any) {
                        const tokenURL = `${BACKEND_URL}qa/feishu_token`
                        const requestAccess = await fetch(
                            tokenURL,
                            {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({code: res.code}),
                            }
                        )
                        const {email} =
                            (await requestAccess.json()) as {
                                email: string
                            }
                        const username = email.substring(0, email.indexOf("@"))
                        // console.log('get username:', username)
                        console.log("Cognito configured");
                        try {
                            Amplify.configure(awsConfig);
                            console.log('User logging...');
                            handleSignIn(username).then((user) => {
                                // console.log('User info:', user);
                                if (user) {
                                    (async () => {
                                        const userId = user.attributes.sub;
                                        const userName = user.username;
                                        // console.log('user.userid:', userId);
                                        // console.log('user.username:', userName);
                                        rootComponent = <Login.Custom userId={userId} userName={userName}/>;
                                        root.render(
                                            <React.StrictMode>
                                                <Provider store={userReduxStore}>{rootComponent}</Provider>
                                            </React.StrictMode>
                                        );
                                    })();
                                } else {
                                    console.log('User sign in failed or user session is missing.');
                                    alert('用户登录失败，请提交飞书流程申请权限，或联系管理员！');
                                }
                            });
                        } catch (e) {
                            console.error(e);
                        }
                    },
                    fail(res) {
                        console.log(`requestAccess fail: ${JSON.stringify(res)}`);
                    }
                })
            });
        }
    });
}

root.render(
    <React.StrictMode>
        <Provider store={userReduxStore}>{rootComponent}</Provider>
    </React.StrictMode>
);
