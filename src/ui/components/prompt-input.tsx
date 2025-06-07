import { Box, Text } from "ink";
import BlinkingCursor from "./blinking-cursor";

type Props = {
	input: string;
};

/**
 * A component that displays a prompt input field.
 */
export default function PromptInput({ input }: Props) {
	return (
		<Box marginLeft={1}>
			<Text color="#5ac8fa" bold>
				💲
			</Text>
			<Box marginLeft={2}>
				<Text color="#e6e6e6">{input}</Text>
			</Box>
			<BlinkingCursor />
		</Box>
	);
}
