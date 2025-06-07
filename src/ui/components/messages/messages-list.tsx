import { Box } from "ink";
import type { Message } from "../../types.ts";
import MessageItem from "./message-item.tsx";

type Props = {
	messages: readonly Message[];
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
