import logging
import os

import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

logger = logging.getLogger(__name__)

# DynamoDB table name
QUERY_ENTITY_TABLE_NAME = 'NlqEntity'
DYNAMODB_AWS_REGION = os.environ.get('DYNAMODB_AWS_REGION')


class DynamoEntity:
    def __init__(self, entity, profile_name, entity_type, entity_count, entity_table_info, time_str):
        self.entity = entity
        self.profile_name = profile_name
        self.entity_type = entity_type
        self.entity_count = entity_count
        self.entity_table_info = entity_table_info
        self.time_str = time_str

    def to_dict(self):
        """Convert to DynamoDB item format"""
        return {
            'entity': self.entity,
            'profile_name': self.profile_name,
            'entity_type': self.entity_type,
            'entity_count': self.entity_count,
            'entity_table_info': self.entity_table_info,
            'time_str': self.time_str
        }


class DynamoEntityDao:

    def __init__(self, table_name_prefix=''):
        self.dynamodb = boto3.resource('dynamodb', region_name=DYNAMODB_AWS_REGION)
        self.table_name = table_name_prefix + QUERY_ENTITY_TABLE_NAME
        if not self.exists():
            self.create_table()
        self.table = self.dynamodb.Table(self.table_name)

    def exists(self):
        """
        Determines whether a table exists. As a side effect, stores the table in
        a member variable.

        :param table_name: The name of the table to check.
        :return: True when the table exists; otherwise, False.
        """
        try:
            table = self.dynamodb.Table(self.table_name)
            table.load()
            exists = True
        except ClientError as err:
            if err.response["Error"]["Code"] == "ResourceNotFoundException":
                exists = False
                logger.info("Table does not exist")
            else:
                logger.error(
                    "Couldn't check for existence of %s. Here's why: %s: %s",
                    self.table_name,
                    err.response["Error"]["Code"],
                    err.response["Error"]["Message"],
                )
                raise
        # else:
        #     self.table = table
        return exists

    def create_table(self):
        try:
            self.table = self.dynamodb.create_table(
                TableName=self.table_name,
                KeySchema=[
                    {"AttributeName": "session_id", "KeyType": "HASH"},  # Partition key
                    # {"AttributeName": "title", "KeyType": "RANGE"},  # Sort key
                ],
                AttributeDefinitions=[
                    {"AttributeName": "session_id", "AttributeType": "S"},
                    # {"AttributeName": "conn_name", "AttributeType": "S"},
                ],
                BillingMode='PAY_PER_REQUEST',
            )
            self.table.wait_until_exists()
            logger.info(f"DynamoDB Table {self.table_name} created")
        except ClientError as err:
            print(type(err))
            logger.error(
                "Couldn't create table %s. Here's why: %s: %s",
                self.table_name,
                err.response["Error"]["Code"],
                err.response["Error"]["Message"],
            )
            raise

    def add(self, entity):
        try:
            self.table.put_item(Item=entity.to_dict())
        except Exception as e:
            logger.error("add log entity is error {}", e)

    def update(self, entity):
        self.table.put_item(Item=entity.to_dict())

    def add_log(self, log_id, profile_name, user_id, session_id, sql, query, intent, log_info, log_type, time_str):
        entity = DynamoQueryLogEntity(log_id, profile_name, user_id, session_id, sql, query, intent, log_info, log_type,
                                      time_str)
        self.add(entity)

    def get_history_by_user_profile(self, user_id, profile_name):
        try:
            # First, we need to scan the table to find all items for the user and profile
            response = self.table.scan(
                FilterExpression=Key('user_id').eq(user_id) & Key('profile_name').eq(profile_name) & Key('log_type').eq(
                    "chat_history")
            )

            items = response['Items']

            # DynamoDB might not return all items in a single response if the data set is large
            while 'LastEvaluatedKey' in response:
                response = self.table.scan(
                    FilterExpression=Key('user_id').eq(user_id) & Key('profile_name').eq(profile_name) & Key(
                        'log_type').eq("chat_history"),
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                items.extend(response['Items'])

            # Sort the items by time_str to get them in chronological order
            sorted_items = sorted(items, key=lambda x: x['time_str'])

            return sorted_items

        except ClientError as err:
            logger.error(
                "Couldn't get history for user %s and profile %s. Here's why: %s: %s",
                user_id,
                profile_name,
                err.response["Error"]["Code"],
                err.response["Error"]["Message"],
            )
            return []

    def get_all_history(self):
        try:
            # First, we need to scan the table to find all items for the user and profile
            response = self.table.scan(
                FilterExpression=Key('log_type').eq("chat_history")
            )

            items = response['Items']

            # DynamoDB might not return all items in a single response if the data set is large
            while 'LastEvaluatedKey' in response:
                response = self.table.scan(
                    FilterExpression=Key('log_type').eq("chat_history"),
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                items.extend(response['Items'])

            # Sort the items by time_str to get them in chronological order
            sorted_items = sorted(items, key=lambda x: x['time_str'])

            return sorted_items

        except ClientError as err:
            logger.error(
                "Couldn't get history Here's why: %s: %s",
                err.response["Error"]["Code"],
                err.response["Error"]["Message"],
            )
            return []
