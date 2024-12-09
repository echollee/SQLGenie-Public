import {useEffect} from "react";

import {
    APP_LOGO,
    APP_LOGO_DISPLAY_ON_LOGIN_PAGE, APP_VERSION,
    BACKEND_URL,
    FEISHU_APP_ID
} from "../utils/constants";

import AuthWithCognito, {
    AppWrapper,
    AuthTitle,
    WrapperThemeProvider
} from "../components/Login/AuthWithCognito/index.tsx"
import {Amplify, Auth} from "aws-amplify";
import {awsConfig} from "../components/Login/AuthWithFeishu/aws-config.ts";
import AuthManager from "../components/Login/AuthWithFeishu/AuthManager.ts";
import {Authenticator, Heading, Image, useTheme, View} from "@aws-amplify/ui-react";

function loadScript(src, onload) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = onload;
    script.onerror = () => console.error(`Failed to load script: ${src}`);
    document.head.appendChild(script);
}


async function handleSignIn() {
    try {
        const user = await Auth.signIn("", ""); // Wait for sign-in to complete
        console.log("Sign-in successful:", user);
        return user
    } catch (error) {
        console.error("Error during sign-in:", error);
        // return ''
    }
}

export default function AuthWithFeishuSso() {
    useEffect(() => {
        loadScript('https://lf1-cdn-tos.bytegoofy.com/goofy/lark/op/h5-js-sdk-1.5.33.js', () => {
            if (!window.h5sdk) {
                alert('H5 SDK failed to initialize');
            } else {
                console.log('H5 SDK loaded');
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


                            console.log("Cognito configured");
                            try {
                                Amplify.configure(awsConfig);
                                console.log('loginCount:', AuthManager.loginCount);
                                if (AuthManager.loginCount > 0) {
                                    console.log('User is already logged in.');
                                } else {
                                    console.log('User logging...');
                                    AuthManager.incrementLoginCount();
                                    handleSignIn().then((user) => {
                                        // console.log('User info:', user);
                                        if (user) {
                                            (async () => {
                                                console.log('user.username:', user.username)
                                                while (!user.username) {
                                                    console.log('Waiting for username...');
                                                    await new Promise((resolve) => setTimeout(resolve, 3000));
                                                }
                                                AuthManager.incrementLoginCount();
                                            })();
                                        } else {
                                            console.log('User sign in failed or user session is missing.');
                                            alert('用户登录失败，请提交飞书流程申请权限，或联系管理员！');
                                        }
                                    });
                                }
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
    })
    return (
        <main style={{padding: "1rem 0"}}>
            <h2>我是Tab2</h2>
        </main>
    );
    /*return (
        <WrapperThemeProvider>
            <Authenticator
                signUpAttributes={["email"]}
                components={{
                    Header() {
                        const {tokens} = useTheme();
                        return !APP_LOGO_DISPLAY_ON_LOGIN_PAGE ? (
                            <AuthTitle/>
                        ) : (
                            <View
                                textAlign="center"
                                margin={`${tokens.space.xxl} auto`}
                                position="relative"
                            >
                                {APP_LOGO && (
                                    <Image alt="App logo" src={APP_LOGO} width={200}/>
                                )}
                                <View padding={tokens.space.small}>
                                    <Heading fontWeight="400" level={3}>
                                        Generative Business Intelligence
                                    </Heading>
                                    {APP_VERSION && (
                                        <Heading fontWeight="200">{APP_VERSION}</Heading>
                                    )}
                                </View>

                                <Heading fontWeight="200">
                                    Guidance on Amazon Web Services
                                </Heading>
                                {!APP_LOGO && (
                                    <Image
                                        width="50px"
                                        alt="Amazon Web Services Logo"
                                        src="/smile-logo.png"
                                    />
                                )}
                            </View>
                        );
                    },
                }}
            >
                {({signOut, user}) => (
                    <AppWrapper signOut={signOut} user={user as any}/>
                )}
            </Authenticator>
        </WrapperThemeProvider>
    );*/
}
