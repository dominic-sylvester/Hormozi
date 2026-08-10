import type { EveMessage, EveMessagePart } from "eve/react";

function renderPart(part: EveMessagePart, index: number) {
  if (part.type === "text") {
    return (
      <p key={index} className="message-text">
        {part.text}
      </p>
    );
  }

  if (part.type === "reasoning") {
    return (
      <details key={index} className="message-reasoning">
        <summary>Reasoning</summary>
        <p>{part.text}</p>
      </details>
    );
  }

  if (part.type === "dynamic-tool") {
    const name = part.toolName ?? "tool";
    const state = part.state ?? "unknown";
    return (
      <div key={index} className="message-tool">
        <span className="message-tool-name">{name}</span>
        <span className="message-tool-state">{state}</span>
      </div>
    );
  }

  return null;
}

export function MessageBubble({ message }: { message: EveMessage }) {
  const isUser = message.role === "user";

  return (
    <article className={`message ${isUser ? "message-user" : "message-assistant"}`}>
      <header className="message-header">{isUser ? "You" : "CEO"}</header>
      <div className="message-body">
        {message.parts.map((part, index) => renderPart(part, index))}
      </div>
    </article>
  );
}
