import { Box, Text, Transform } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "../chat/context";

type Props = {
	input: string;
};

/**
 * A component that displays a prompt input field.
 */
export default function PromptInput({ input }: Props) {
	return (
		<Box marginLeft={0}>
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

function BlinkingCursor() {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const interval = setInterval(() => {
			setIsVisible((prev) => !prev);
		}, 500);

		return () => clearInterval(interval);
	}, []);

	return (
		<Transform transform={(text) => (isVisible ? text : " ")}>
			<Text color="#5ac8fa">|</Text>
		</Transform>
	);
}
