import { Box } from "ink";
import { useChat } from "../../chat/context.ts";
import type { Message } from "../../types.ts";
import MessageItem from "./message-item.tsx";

type Props = {
	messages: Message[];
	streamingResponse: string;
};

export default function MessagesList({ messages, streamingResponse }: Props) {
	return (
		<Box flexDirection="column" gap={1}>
			{messages.map((message) => (
				<MessageItem key={message.id} message={message} />
			))}

			{streamingResponse ? (
				<MessageItem
					message={{
						id: "streaming-response",
						role: "assistant",
						content: streamingResponse,
					}}
				/>
			) : null}
		</Box>
	);
}
