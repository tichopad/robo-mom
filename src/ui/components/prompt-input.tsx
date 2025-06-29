import { Box, Text, Transform } from "ink";
import { useEffect, useState } from "react";
import BlinkingCursor from "./blinking-cursor";

type Props = {
	input: string;
};

/**
 * A component that displays a prompt input field.
 */
export default function PromptInput({ input }: Props) {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const interval = setInterval(() => {
			setIsVisible((prev) => !prev);
		}, 500);

		return () => clearInterval(interval);
	}, []);

	return (
		<Box marginLeft={1}>
			<Text color="#5ac8fa" bold>
				💲
			</Text>
			<Box marginLeft={2}>
				<Text color="#e6e6e6">
					{input}
					{isVisible ? "|" : ""}
				</Text>
			</Box>
		</Box>
	);
}
