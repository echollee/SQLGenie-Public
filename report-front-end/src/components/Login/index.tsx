import AuthWithAzureAd from "./AuthWithAzureAd";
import AuthWithCognito from "./AuthWithCognito";
import AuthWithNothing from "./AuthWithNothing";
import AuthWithOidc from "./AuthWithOidc";
import AuthWithSso from "./AuthWithSso";
// import AuthwithFeishu from "./AuthwithFeishu";

const Login = {
  Cognito: AuthWithCognito,
  Sso: AuthWithSso,
  Oidc: AuthWithOidc,
  AzureAd: AuthWithAzureAd,
  Custom: AuthWithNothing,
  // Feishu: AuthwithFeishu,
};

export default Login;
