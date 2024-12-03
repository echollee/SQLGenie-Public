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
    AUTH_WITH_FEISHU, FEISHU_APP_ID, BACKEND_URL,
} from "./utils/constants";
import {Storage} from "./utils/helpers/storage";
import userReduxStore from "./utils/helpers/store";

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
if (AUTH_WITH_FEISHU) {
    const script0 = document.createElement('script');
    script0.type = 'text/javascript';
    script0.async = false;
    script0.src = 'https://cdn.staticfile.org/jquery/1.10.2/jquery.min.js';
    document.head.appendChild(script0);

    // 创建第二个 script 元素
    const script3 = document.createElement('script');
    script3.type = 'text/javascript';
    script3.async = false;
    script3.src = 'https://unpkg.com/vconsole/dist/vconsole.min.js';
    document.head.appendChild(script3);

    // 创建第二个 script 元素
    const script4 = document.createElement('script');
    script4.type = 'text/javascript';
    script4.async = false;
    script4.src = 'https://dhsso.s3.cn-north-1.amazonaws.com.cn/js/vconsole.js';
    document.head.appendChild(script4);
    rootComponent = <Login.Feishu/>;
}

root.render(
    <React.StrictMode>
        <Provider store={userReduxStore}>{rootComponent}</Provider>
    </React.StrictMode>
);
