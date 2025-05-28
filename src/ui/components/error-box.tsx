import { Box, Text } from "ink";

export type Props = {
	message: string;
};

export function ErrorBox({ message }: Props) {
	return (
		<Box marginX={1} marginY={0}>
			<Text color="#ff3b30">● Error: {message}</Text>
		</Box>
	);
}
