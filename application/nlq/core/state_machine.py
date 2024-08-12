import logging

import pandas as pd

from api.schemas import Answer, KnowledgeSearchResult, SQLSearchResult, AgentSearchResult, AskReplayResult, \
    AskEntitySelect
from nlq.core.chat_context import ProcessingContext
from nlq.core.state import QueryState
from utils.apis import get_sql_result_tool
from utils.llm import get_query_intent, get_query_rewrite, knowledge_search, text_to_sql, data_analyse_tool
from utils.text_search import entity_retrieve_search, qa_retrieve_search
from utils.tool import get_generated_sql

logger = logging.getLogger(__name__)
class QueryStateMachine:
    def __init__(self, initial_state, context: ProcessingContext):
        self.state = initial_state
        self.context = context
        self.answer = Answer(
            query="",
            query_rewrite="",
            query_intent="",
            knowledge_search_result=KnowledgeSearchResult(
                knowledge_response=""
            ),
            sql_search_result=SQLSearchResult(
                sql="",
                sql_data=[],
                data_show_type="",
                sql_gen_process="",
                data_analyse="",
                sql_data_chart=[]
            ),
            agent_search_result=AgentSearchResult(
                agent_sql_search_result=[],
                agent_summary=""
            ),
            ask_rewrite_result=AskReplayResult(
                query_rewrite=""
            ),
            suggested_question=[],
            ask_entity_select=AskEntitySelect(
                entity_select="",
                entity_info={}
            )
        )

        self.search_intent_flag = False
        self.reject_intent_flag = False
        self.agent_intent_flag = False
        self.knowledge_search_flag = False

        self.intent_search_result = {}
        self.agent_search_result = {}
        self.entity_slot = []
        self.normal_search_entity_slot = []
        self.normal_search_qa_retrival = {}
        self.agent_qa_retrieval = []

    def transition(self, new_state):
        self.state = new_state

    def get_state(self):
        return self.state

    def run(self):
        if self.context.previous_state == QueryState.ASK_ENTITY_SELECT.name:
            self.transition(QueryState.COMPLETE)
        elif self.context.previous_state == QueryState.ASK_QUERY_REWRITE.name:
            self.answer.query_intent = "ask_in_reply"
            self.transition(QueryState.COMPLETE)
        while self.state != QueryState.COMPLETE and self.state != QueryState.ERROR:
            if self.state == QueryState.INITIAL:
                self.handle_initial()
            elif self.state == QueryState.ENTITY_RETRIEVAL:
                self.handle_entity_retrieval()
            elif self.state == QueryState.QA_RETRIEVAL:
                self.handle_qa_retrieval()
            elif self.state == QueryState.SQL_GENERATION:
                self.handle_sql_generation()
            elif self.state == QueryState.INTENT_RECOGNITION:
                self.handle_intent_recognition()
            elif self.state == QueryState.ENTITY_SELECTION:
                self.handle_entity_selection()
            elif self.state == QueryState.EXECUTE_QUERY:
                self.handle_execute_query()
            elif self.state == QueryState.ANALYZE_DATA:
                self.handle_analyze_data()
            else:
                self.state = QueryState.ERROR

    def handle_ask_entity(self):
        self.transition(QueryState.QA_RETRIEVAL)

    def handle_initial(self):
        # Initial setup and context preparation
        if self.context.context_window > 0:
            user_query_history = self.context.user_query_history
            query_rewrite_result = get_query_rewrite(self.context.model_type, self.context.search_box,
                                                     self.context.database_profile['prompt_map'], user_query_history)
            self.context.query_rewrite = query_rewrite_result.get("query")
            query_rewrite_intent = query_rewrite_result.get("intent")
            if "ask_in_reply" == query_rewrite_intent:
                self.transition(QueryState.COMPLETE)
            else:
                self.transition(QueryState.INTENT_RECOGNITION)
        else:
            self.transition(QueryState.INTENT_RECOGNITION)

    def handle_entity_retrieval(self):
        # Perform entity retrieval

        if self.context.use_rag_flag:
            self.normal_search_entity_slot = entity_retrieve_search(self.entity_slot,
                                                                       self.context.opensearch_info,
                                                                       self.context.selected_profile)
        else:
            self.normal_search_entity_slot = []

        self.transition(QueryState.QA_RETRIEVAL)

    def handle_qa_retrieval(self):
        # Perform QA retrieval
        if self.context.use_rag_flag:
            self.normal_search_qa_retrival = qa_retrieve_search(self.context.query_rewrite, self.context.opensearch_info,
                                                           self.context.selected_profile)
        else:
            self.normal_search_qa_retrival = []

        self.transition(QueryState.SQL_GENERATION)

    def handle_sql_generation(self):
        # Generate SQL
        sql = ""
        response = ""
        try:
            response = text_to_sql(self.context.database_profile['tables_info'],
                                   self.context.database_profile['hints'],
                                   self.context.database_profile['prompt_map'],
                                   self.context.query_rewrite,
                                   model_id=self.context.model_type,
                                   sql_examples=self.normal_search_qa_retrival,
                                   ner_example=self.normal_search_entity_slot,
                                   dialect=self.context.database_profile['db_type'],
                                   model_provider=None)
            sql = get_generated_sql(response)
        except Exception as e:
            logger.error("handle_sql_generation is error")
            logger.error(e)
        self.intent_search_result["sql"] = sql
        self.intent_search_result["response"] = response
        self.transition(QueryState.EXECUTE_QUERY)

    def handle_intent_recognition(self):
        # Perform intent recognition
        if self.context.intent_ner_recognition_flag:
            intent_response = get_query_intent(self.context.model_type, self.context.query_rewrite,
                                               self.context.database_profile['prompt_map'])
            intent = intent_response.get("intent", "normal_search")
            self.entity_slot = intent_response.get("slot", [])
            if intent == "reject_search":
                self.reject_intent_flag = True
                self.search_intent_flag = False
            elif intent == "agent_search":
                self.agent_intent_flag = True
                if self.context.agent_cot_flag:
                    self.search_intent_flag = False
                else:
                    self.search_intent_flag = True
                    self.agent_intent_flag = False
            elif intent == "knowledge_search":
                self.knowledge_search_flag = True
                self.search_intent_flag = False
                self.agent_intent_flag = False
            else:
                self.search_intent_flag = True
        else:
            self.search_intent_flag = True

        if self.reject_intent_flag:
            self.transition(QueryState.REJECT_INTENT)
        elif self.knowledge_search_flag:
            self.transition(QueryState.KNOWLEDGE_SEARCH)
        self.transition(QueryState.ENTITY_RETRIEVAL)

    def handle_reject_intent(self):
        self.answer.query = self.context.search_box
        self.answer.query_rewrite = self.context.query_rewrite
        self.answer.query_intent = "reject_search"
        self.transition(QueryState.COMPLETE)

    def handle_knowledge_search(self):
        response = knowledge_search(search_box=self.context.query_rewrite, model_id=self.context.model_type,
                                    prompt_map=self.context.database_profile["prompt_map"])
        self.answer.query = self.context.search_box
        self.answer.query_rewrite = self.context.query_rewrite
        self.answer.query_intent = "knowledge_search"
        self.answer.knowledge_search_result.knowledge_response = response
        self.transition(QueryState.COMPLETE)

    def handel_intent_search(self):
        self.transition(QueryState.ENTITY_RETRIEVAL)

    def handle_entity_selection(self):
        # Handle entity selection
        self.transition(QueryState.EXECUTE_QUERY)

    def handle_execute_query(self, database_profile, sql):
        # Execute the SQL query
        if sql == "":
            sql_execute_result = {"data": pd.DataFrame(), "sql": sql, "status_code": 500, "error_info": "The SQL is empty."}
        else:
            sql_execute_result = get_sql_result_tool(database_profile, sql)
        self.intent_search_result["sql_execute_result"] = sql_execute_result
        if self.context.data_with_analyse and sql_execute_result["status_code"] == 200:
            self.transition(QueryState.ANALYZE_DATA)
        else:
            self.transition(QueryState.ERROR)

    def handle_analyze_data(self):
        # Analyze the data
        if self.context.
        search_intent_analyse_result = data_analyse_tool(self.context.model_type, prompt_map, self.context.query_rewrite,
                                                         search_intent_result["data"].to_json(
                                                             orient='records',
                                                             force_ascii=False), "query")
        self.transition(QueryState.COMPLETE)
