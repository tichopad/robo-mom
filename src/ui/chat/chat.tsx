import { Box, Text, useApp, useInput } from "ink";
import {
	appendInput,
	deleteInputTail,
	sendUserInputToLLM,
	useChatStore,
} from "./store.ts";
import DebugBox from "../components/debug-box.tsx";
import { ErrorBox } from "../components/error-box.tsx";
import Footer from "../components/footer.tsx";
import { LoadingSpinner } from "../components/loading-spinner.tsx";
import MessagesList from "../components/messages/messages-list.tsx";
import PromptInput from "../components/prompt-input.tsx";

const DEBUG = true;

export default function Chat() {
	const store = useChatStore();
	const app = useApp();

	useInput((inputChar, key) => {
		// Prevent input while loading
		if (store.isLoading) return;

		if (key.return && store.input.trim() === "/exit") {
			app.exit();
			return;
		}

		if (key.return) {
			sendUserInputToLLM();
		} else if (key.backspace || key.delete) {
			deleteInputTail();
		} else {
			appendInput(inputChar);
		}
	});

	return (
		<Box
			flexDirection="column"
			width="100%"
			height="100%"
			borderStyle="bold"
			borderColor="#333"
			paddingY={1}
			paddingX={2}
			gap={1}
			margin={0}
		>
			{DEBUG && store.debugInfo ? <DebugBox message={store.debugInfo} /> : null}
			{store.error ? <ErrorBox message={store.error} /> : null}
			<MessagesList
				messages={store.messages}
				streamingResponse={store.streamingResponse}
			/>
			{store.isLoading ? (
				<Box gap={2}>
					<Box width={3} justifyContent="flex-end">
						<LoadingSpinner />
					</Box>
					<Text color="#777" dimColor bold={false}>
						thinking...
					</Text>
				</Box>
			) : (
				<PromptInput input={store.input} />
			)}
			<Footer />
		</Box>
	);
}
