import { Box, Text } from "ink";
import type { Message } from "../../types.ts";

const colors = {
	user: "#5ac8fa",
	assistant: "#4cd964",
	userText: "#ffffff",
	assistantText: "#e6e6e6",
	loadingText: "#777",
};

type MessageProps = {
	message: Message;
};

export default function MessageItem({ message }: MessageProps) {
	if (message.role === "user") {
		return (
			<MessageItemWrapper>
				<Box width={3}>
					<Text color={colors.user} bold>
						👤
					</Text>
				</Box>
				<Text color={colors.userText} bold>
					{message.content}
				</Text>
			</MessageItemWrapper>
		);
	}

	if (message.role === "assistant") {
		return (
			<MessageItemWrapper>
				<Box width={4}>
					<Text color={colors.assistant} bold>
						🤖
					</Text>
				</Box>
				<Text color={colors.assistantText}>{message.content}</Text>
			</MessageItemWrapper>
		);
	}

	return null;
}

function MessageItemWrapper({ children }: { children: React.ReactNode }) {
	return <Box gap={1}>{children}</Box>;
}
