
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
  const [output, setOutput] = useState([]);

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

  const handleRuncode = () => {
    const code = editorRef.current?.getValue() ?? "";
    const logs = [];
    const originalLog = console.log;

    try {
      console.log = (...args) => {
        logs.push(
          args
            .map((arg) =>
              typeof arg === "object" && arg !== null
                ? JSON.stringify(arg)
                : String(arg)
            )
            .join(" ")
        );
      };

      const result = eval(code);

      if (result !== undefined) {
        logs.push(String(result));
      }

      setOutput(logs.length ? logs : ["Code executed successfully"]);
    } catch (error) {
      logs.push(`${error.name}: ${error.message}`);
      setOutput(logs);
    } finally {
      console.log = originalLog;
    }
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
            <li key={index} className="text-gray-950 font-medium" >
              {user.username}
            </li>
          ))}
        </ul>
      </aside>

      <section className="h-full w-3/4 flex flex-col gap-3 min-w-0">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-bold">JavaScript Editor</h2>

          <button
            onClick={handleRuncode}
            className="bg-amber-50 text-gray-950 px-4 py-2 rounded-lg font-bold"
          >
            ▶ Run Code
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-neutral-800 rounded-lg overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            defaultValue={'console.log("Hello World");'}
            theme="vs-dark"
            onMount={handleMount}
          />
        </div>

        <div className="h-1/4 min-h-32 bg-gray-900 text-white rounded-lg p-3 overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Output Console</h3>

            <button
              onClick={() => setOutput([])}
              className="text-gray-300 hover:text-white text-sm"
            >
              Clear
            </button>
          </div>

          <pre className="text-green-400 whitespace-pre-wrap break-words">
            {output.join("\n")}
          </pre>
        </div>
      </section>
    </main>
  );
};

export default App;
