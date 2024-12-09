import React, {useEffect} from "react";
import App from "../../app";
import {useDispatch} from "react-redux";
import {ActionType} from "../../utils/helpers/types";

function loadScript(src, onload) {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = onload;
    script.onerror = () => console.error(`Failed to load script: ${src}`);
    document.head.appendChild(script);
}


interface AuthWithNothingProps {
    userId: string;
    userName: string;
}

const AuthWithNothing: React.FC<AuthWithNothingProps> = ({userId, userName}) => {
    const dispatch = useDispatch();
    useEffect(() => {
        loadScript('https://lf1-cdn-tos.bytegoofy.com/goofy/lark/op/h5-js-sdk-1.5.33.js', () => {
            if (!window.h5sdk) {
                alert('H5 SDK failed to initialize');
            } else {
                console.log('H5 SDK loaded');
                // console.log('userid+userName:', userId, userName);
                dispatch({
                    type: ActionType.UpdateUserInfo,
                    state: {
                        userId: userId,
                        displayName: userName,
                        loginExpiration: 0,
                        isLogin: true,
                        username: userName,
                    },
                });
            }
        });
    }, [dispatch, userId, userName]);
    return <App/>;
};

export default AuthWithNothing;
