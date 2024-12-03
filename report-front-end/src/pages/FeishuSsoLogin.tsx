import {useEffect} from "react";

import {
    BACKEND_URL,
    FEISHU_APP_ID
} from "../utils/constants";

function loadScript(src, onload) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = onload;
    script.onerror = () => console.error(`Failed to load script: ${src}`);
    document.head.appendChild(script);
}

export default function AuthWithFeishuSso() {
    useEffect(() => {
        loadScript('https://lf1-cdn-tos.bytegoofy.com/goofy/lark/op/h5-js-sdk-1.5.33.js', () => {
            console.log('H5 SDK loaded');
            if (!window.h5sdk) {
                alert('H5 SDK failed to initialize');
            } else {
                window.h5sdk.ready(function () {
                    // console.log('FEISHU_APP_ID',FEISHU_APP_ID);
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
                            console.log('username:', username)
                        },
                        fail(res) {
                            console.log(`requestAccess fail: ${JSON.stringify(res)}`);
                        }
                    })
                });
            }
        });
    })
    return (
        <main style={{padding: "1rem 0"}}>
            <h2>我是Tab2</h2>
        </main>
    );
}
