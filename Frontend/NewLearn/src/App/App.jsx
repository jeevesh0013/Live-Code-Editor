
import "./App.css";
import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useState, useEffect } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

const App = () => {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const ytext = useMemo(() => ydoc.getText("monaco"), [ydoc]);
  const editorRef = useRef(null);

  const [editor, setEditor] = useState(null);

  const [userName, setUserName] = useState(() => {
    const params = new URLSearchParams(window.location.search).get("username");
    return params || "";
  });

  const [users, setUsers] = useState([]);

  const handleMount = (editor) => {
    editorRef.current = editor;
    setEditor(editor);
  };

  const handlejoin = (e) => {
    e.preventDefault();
    const username = e.target.username.value.trim();

    if (!username) return;

    setUserName(username);
    window.history.pushState(
      {},
      "",
      `?username=${encodeURIComponent(username)}`
    );
  };

  useEffect(() => {
    if (!userName || !editor) return;

    const provider = new SocketIOProvider(
      "/",
      "monaco",
      ydoc,
      { autoCorrect: true },
      {}
    );

    provider.awareness.setLocalStateField("user", {
      username: userName,
    });

    const handleAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values());

      setUsers(
        states
          .map((state) => state.user)
          .filter((user) => user && user.username)
      );
    };

    provider.awareness.on("change", handleAwarenessChange);
    handleAwarenessChange();

    const binding = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );

    function handleBeforeUnload() {
      provider.awareness.setLocalStateField("user", null);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      provider.awareness.off("change", handleAwarenessChange);
      binding.destroy();
      provider.destroy();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [userName, editor, ydoc, ytext]);

  if (!userName) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center">
        <form onSubmit={handlejoin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your Username"
            className="p-2 rounded-lg bg-gray-800 text-white"
            name="username"
            required
          />

          <button
            className="bg-amber-50 text-gray-950 p-2 rounded-lg font-bold"
            type="submit"
          >
            Join
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      <aside className="h-full w-1/4 bg-amber-50 rounded-lg">
        <h2 className="text-gray-950 font-bold text-lg p-4 border-b border-gray-300">
          Active Users
        </h2>

        <ul className="p-4">
          {users.map((user, index) => (
            <li key={index} className="text-gray-950 font-medium">
              {user.username}
            </li>
          ))}
        </ul>
      </aside>

      <section className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Start coding here"
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>
    </main>
  );
};

export default App;