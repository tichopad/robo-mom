import { Box, Text } from "ink";

export type Props = {
	message: string;
};

export default function DebugBox({ message }: Props) {
	return (
		<Box marginX={1} marginY={0}>
			<Text color="#f5a623" dimColor>
				↳ {message}
			</Text>
		</Box>
	);
}
