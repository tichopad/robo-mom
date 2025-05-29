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
			<Body>
				<Avatar>
					<Text color={colors.user} bold>
						👤
					</Text>
				</Avatar>
				<Box alignItems="flex-start">
					<Text color={colors.userText} bold>
						{message.content}
					</Text>
				</Box>
			</Body>
		);
	}

	if (message.role === "assistant") {
		return (
			<Body>
				<Avatar>
					<Text color={colors.assistant} bold>
						🤖
					</Text>
				</Avatar>
				<Box alignItems="flex-start">
					<Text color={colors.assistantText}>{message.content}</Text>
				</Box>
			</Body>
		);
	}

	return null;
}

function Avatar({ children }: { children: React.ReactNode }) {
	return (
		<Box width={5} alignItems="flex-start" justifyContent="center">
			{children}
		</Box>
	);
}

function Body({ children }: { children: React.ReactNode }) {
	return (
		<Box alignItems="flex-start" justifyContent="flex-start">
			{children}
		</Box>
	);
}
