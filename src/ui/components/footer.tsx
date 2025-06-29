import { Box, Text } from "ink";

export default function Footer() {
	return (
		<Box justifyContent="center">
			<Text color="#777" dimColor>
				enter to send · ctrl+n for new chat · /exit to quit · ctrl+c to exit
			</Text>
		</Box>
	);
}
