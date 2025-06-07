import { Text, Transform } from "ink";
import { useEffect, useState } from "react";

export default function BlinkingCursor() {
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
