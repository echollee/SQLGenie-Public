import {AmplifyUser} from "@aws-amplify/ui";
import {useDispatch} from "react-redux";
import {
    Authenticator, Button, Text,
    defaultDarkModeOverride,
    Heading,
    Image,
    ThemeProvider,
    useAuthenticator,
    UseAuthenticator,
    useTheme,
    View,
    VisuallyHidden,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import {Mode} from "@cloudscape-design/global-styles";
import {Amplify, Auth} from "aws-amplify";
import {useEffect, useState} from "react";
import toast from "react-hot-toast";
import App from "../../../app";
import {
    APP_LOGO,
    APP_LOGO_DISPLAY_ON_LOGIN_PAGE,
    APP_VERSION,
    AUTH_WITH_FEISHU,
    AUTH_WITH_COGNITO,
    AUTH_WITH_SSO,
    LOCAL_STORAGE_KEYS,
} from "../../../utils/constants";
import {Storage} from "../../../utils/helpers/storage";
import {ActionType, UserInfo} from "../../../utils/helpers/types";
import {awsConfig} from "./aws-config";
import "./layout-with-feishu.css";
import AuthManager from "./AuthManager";
import FeishuSsoLogin from "../../../pages/FeishuSsoLogin.tsx"

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

export default function AuthWithFeishu() {
    const dispatch = useDispatch();
    console.log('AuthWithFeishu')
    useEffect(() => {
        console.log("Cognito configured");
        try {
            Amplify.configure(awsConfig);
            console.log('loginCount:', AuthManager.loginCount);
            if (AuthManager.loginCount > 0) {
                console.log('User is already logged in.');
            } else {
                // console.log('User logging...');
                AuthManager.incrementLoginCount();
                handleSignIn().then((user) => {
                    // console.log('User info:', user);
                    if (user) {
                        (async () => {
                            // console.log('user.username:', user.username)
                            while (!user.username) {
                                console.log('Waiting for username...');
                                await new Promise((resolve) => setTimeout(resolve, 3000));
                            }
                            AuthManager.incrementLoginCount();
                            // window.location.reload();
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
    }, [dispatch]);

    return (
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
    );
}
export type SignOut = UseAuthenticator["signOut"];

export const AppWrapper: React.FC<{
    signOut?: SignOut;
    user?: AmplifyUser & { signInUserSession: any };
}> = ({user}) => {
    const dispatch = useDispatch();
    useEffect(() => {
        console.log({user, signInUserSession: user?.signInUserSession});
        if (!user?.signInUserSession) return;

        if (AUTH_WITH_FEISHU) {
            try {
                const {
                    signInUserSession: {
                        accessToken: {jwtToken: accessToken},
                        idToken: {jwtToken: idToken},
                        refreshToken: {token: refreshToken},
                    },
                } = user;
                const loginUser: UserInfo = {
                    userId: user?.attributes?.sub || "",
                    displayName:
                        user?.attributes?.displayName || user?.attributes?.email || "",
                    loginExpiration: 0,
                    isLogin: true,
                    username: user?.username || "",
                };
                localStorage.setItem(LOCAL_STORAGE_KEYS.accessToken, accessToken);
                localStorage.setItem(LOCAL_STORAGE_KEYS.idToken, idToken);
                localStorage.setItem(LOCAL_STORAGE_KEYS.refreshToken, refreshToken);
                dispatch({type: ActionType.UpdateUserInfo, state: loginUser});
            } catch (error) {
                console.error("Initiating cognito user state error: ", error);
            }
        }
    }, [dispatch, user]);

    if (!user?.signInUserSession) {
        toast.error("User session not found");
        return <div>You need to sign in first</div>;
    }

    return <App/>;
};


export function AuthTitle() {
    const {tokens} = useTheme();
    return (
        <View
            textAlign="center"
            margin={`${tokens.space.xxl} auto ${tokens.space.large} auto`}
            position="relative"
        >
            <View padding={tokens.space.small}>
                <Heading fontWeight="400" level={3}>
                    Generative Business Intelligence
                </Heading>
                {APP_VERSION && <Heading fontWeight="200">{APP_VERSION}</Heading>}
            </View>

            <Heading fontWeight="200">Guidance on Amazon Web Services</Heading>
            <Image
                width="50px"
                alt="Amazon Web Services Logo"
                src="/smile-logo.png"
            />
        </View>
    );
}

export function WrapperThemeProvider({
                                         children,
                                     }: {
    children: React.ReactNode;
}) {
    const [theme, setTheme] = useState(Storage.getTheme());

    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "style"
                ) {
                    const newValue =
                        document.documentElement.style.getPropertyValue(
                            "--app-color-scheme"
                        );

                    const mode = newValue === "dark" ? Mode.Dark : Mode.Light;
                    if (mode !== theme) {
                        setTheme(mode);
                    }
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["style"],
        });

        return () => {
            observer.disconnect();
        };
    }, [theme]);

    return (
        <ThemeProvider
            colorMode={theme === Mode.Dark ? "dark" : "light"}
            theme={{
                name: "default-theme",
                overrides: [defaultDarkModeOverride],
            }}
        >
            {children}
        </ThemeProvider>
    );
}