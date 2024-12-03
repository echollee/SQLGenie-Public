import boto3

client = boto3.client('cognito-idp', region_name='us-east-1')

VITE_COGNITO_REGION='us-east-1'
VITE_COGNITO_USER_POOL_ID='us-east-1_PMabPm6bj'
VITE_COGNITO_USER_POOL_WEB_CLIENT_ID='2vn2p9q5nbjae3m1v1qad6keri'

# Step 1: 初始化自定义认证流
response = client.admin_initiate_auth(
    UserPoolId=VITE_COGNITO_USER_POOL_ID,
    ClientId=VITE_COGNITO_USER_POOL_WEB_CLIENT_ID,
    AuthFlow='USER_AUTH',
    AuthParameters={
        'USERNAME': 'lilei',
        # 其他自定义参数
    }
)

print(response)

# Step 2: 响应认证挑战（如果需要）
# challenge_response = client.admin_respond_to_auth_challenge(
#     UserPoolId=VITE_COGNITO_USER_POOL_ID,
#     ClientId=VITE_COGNITO_USER_POOL_WEB_CLIENT_ID,
#     ChallengeName=response['ChallengeName'],
#     ChallengeResponses={
#         'USERNAME': 'lilei',
#         'ANSWER': 'challenge_answer'  # 比如验证码
#     }
# )
#
# # 获取 Token
# if 'AuthenticationResult' in challenge_response:
#     access_token = challenge_response['AuthenticationResult']['AccessToken']
#     id_token = challenge_response['AuthenticationResult']['IdToken']
#     print("Access Token:", access_token)
#     print("ID Token:", id_token)
# else:
#     print("Authentication failed")