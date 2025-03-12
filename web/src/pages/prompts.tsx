import { useState } from "react";
import { FC } from "react";
import { usePrompts } from "../hooks/usePrompts";
import { useModels } from "../hooks/useModels";

const Prompts: FC = () => {
  const { data: models } = useModels()
  const { postPrompts, postPromptsWithSSE } = usePrompts()
  const [model, setModel] = useState(models?.[0]?.id ?? "")
  const [messages, setMessages] = useState<Parameters<typeof postPrompts>[0]['messages']>([])
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [stream, setStream] = useState(true)

  const isDisabled = !!question && !!model

  const handleSubmit = async () => {
    const cloneMessages = structuredClone(messages)
    setAnswer("")
    setQuestion("")
    cloneMessages.push({
      role: "user",
      content: question
    })
    setMessages(cloneMessages)

    if (stream) {
      await postPromptsWithSSE(
        {
          model,
          messages: cloneMessages
        },
        (chunk) => {
          setAnswer(prev => prev + chunk)
          return false
        }
      )
      setAnswer(prevAnswer => {
        setMessages(() => [...cloneMessages, {
          role: "assistant",
          content: prevAnswer
        }])
        return ""

      })
    } else {
      const result = await postPrompts({
        model,
        messages: cloneMessages
      })
      setMessages(() => [...cloneMessages, {
        role: "assistant",
        content: result.content
      }])
    }
  }

  return <div>
    {messages.map((message, i) => (
      <div key={i} style={{
        whiteSpace: "pre-wrap"
      }}>
        <p>{message.role}</p>
        <div>{message.content}</div>
      </div>
    ))}
    {!!answer &&
      <div style={{
        whiteSpace: "pre-wrap"
      }}>
        <p>assistant</p>
        <div>{answer}</div>
      </div>
    }
    <select value={model} onChange={e => setModel(e.target.value)}>
      <option value=""></option>
      {models?.map(model => (
        <option value={model.id} key={model.id}>{
          model.id
        }</option>
      ))}
    </select>
    <input type="checkbox" checked={stream} onChange={e => setStream(e.currentTarget.checked)} />
    <input value={question} onChange={e => setQuestion(e.currentTarget.value)} />
    <button onClick={handleSubmit}
      disabled={!isDisabled}
    >Submit</button>
  </div>
}

export default Prompts;
