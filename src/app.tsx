import { render } from "ink";
import Chat from "./ui/chat/chat.tsx";

function App() {
	return <Chat />;
}

export function runApp() {
	render(<App />);
}
