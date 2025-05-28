import { Text } from "ink";
import { useEffect, useState } from "react";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function LoadingSpinner() {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setFrame((prev) => (prev + 1) % frames.length);
		}, 80);
		return () => clearInterval(timer);
	}, []);

	return <Text color="cyan">{frames[frame]}</Text>;
}
