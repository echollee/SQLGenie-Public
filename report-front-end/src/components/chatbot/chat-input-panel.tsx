import { Button, Container, Icon, SpaceBetween, } from "@cloudscape-design/components";
import { Dispatch, SetStateAction, useEffect, useLayoutEffect, useState, } from "react";
import TextareaAutosize from "react-textarea-autosize";
import styles from "../../styles/chat.module.scss";
import { ChatBotConfiguration, ChatBotHistoryItem, ChatInputState, } from "./types";
import CustomQuestions from "./custom-questions";
import { BACKEND_URL } from "../../tools/const";

export interface ChatInputPanelProps {
  running: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  configuration: ChatBotConfiguration;
  setConfiguration: Dispatch<SetStateAction<ChatBotConfiguration>>;
  messageHistory: ChatBotHistoryItem[];
  setMessageHistory: Dispatch<SetStateAction<ChatBotHistoryItem[]>>,
}

export abstract class ChatScrollState {
  static userHasScrolled = false;
  static skipNextScrollEvent = false;
  static skipNextHistoryUpdate = false;
}

export default function ChatInputPanel(props: ChatInputPanelProps) {
  const [state, setTextValue] = useState<ChatInputState>({
    value: ""
  });

  useEffect(() => {
    const onWindowScroll = () => {
      if (ChatScrollState.skipNextScrollEvent) {
        ChatScrollState.skipNextScrollEvent = false;
        return;
      }

      const isScrollToTheEnd =
        Math.abs(
          window.innerHeight +
          window.scrollY -
          document.documentElement.scrollHeight
        ) <= 10;

      ChatScrollState.userHasScrolled = !isScrollToTheEnd;
    };

    window.addEventListener("scroll", onWindowScroll);

    return () => {
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, []);

  useLayoutEffect(() => {
    if (ChatScrollState.skipNextHistoryUpdate) {
      ChatScrollState.skipNextHistoryUpdate = false;
      return;
    }

    if (!ChatScrollState.userHasScrolled && props.messageHistory.length > 0) {
      ChatScrollState.skipNextScrollEvent = true;
      window.scrollTo({
        top: document.documentElement.scrollHeight + 1000,
        behavior: "smooth",
      });
    }
  }, [props.messageHistory]);

  const query = async () => {
    props.setLoading(true);
    const param = {
      query: state.value,
      bedrock_model_id: "anthropic.claude-3-sonnet-20240229-v1:0",
      use_rag_flag: true,
      visualize_results_flag: true,
      intent_ner_recognition_flag: true,
      agent_cot_flag: true,
      profile_name: "shopping-demo",
      explain_gen_process_flag: true,
      gen_suggested_question_flag: false,
      top_k: 250,
      top_p: 0.9,
      max_tokens: 2048,
      temperature: 0.01
    };
    const url = `${BACKEND_URL}qa/ask`;
    const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify(param)
      }
    );
    if (!response.ok) {
      return;
    }
    const result = await response.json();
    console.log(result);
    props.setLoading(false);
    props.setMessageHistory((history: ChatBotHistoryItem[]) => {
      return [...history, result];
    });
  }

  const handleSendMessage = () => {
    setTextValue({value: ""});
    query().then();
  };

  return (
    <SpaceBetween direction="vertical" size="l">
      <div className={styles.input_area_container}>
        <Container>
          <SpaceBetween size={'s'}>
            <CustomQuestions setTextValue={setTextValue}></CustomQuestions>
            <div className={styles.input_textarea_container}>
              <SpaceBetween size="xxs" direction="horizontal" alignItems="center">
                <Icon name="microphone" variant="disabled"/>
              </SpaceBetween>
              <TextareaAutosize
                className={styles.input_textarea}
                maxRows={6}
                minRows={1}
                spellCheck={true}
                autoFocus
                onChange={(e) =>
                  setTextValue((state) => ({...state, value: e.target.value}))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                value={state.value}
                placeholder={"Send a message"}
              />
              <div style={{marginLeft: "8px"}}>
                <Button
                  disabled={state.value.length === 0}
                  onClick={handleSendMessage}
                  iconAlign="right"
                  iconName={!props.running ? "angle-right-double" : undefined}
                  variant="primary">
                  Send
                </Button>
                <Button
                  iconName="settings"
                  variant="icon"
                />
              </div>
            </div>
          </SpaceBetween>
        </Container>
      </div>
    </SpaceBetween>
  );
}
