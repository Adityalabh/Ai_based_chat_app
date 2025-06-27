import { useEffect, useRef } from "react";
import ChatPage from "./components/ChatPage";
import EditProfile from "./components/EditProfile";
import Home from "./components/Home";
import Login from "./components/Login";
import MainLayout from "./components/MainLayout";
import Profile from "./components/Profile";
import Signup from "./components/Signup";
import AIChatPage from "./components/AIChatPage"; // Import new AI chat page
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { setOnlineUsers } from "./redux/chatSlice";
import { setLikeNotification } from "./redux/rtnSlice";
import ProtectedRoutes from "./components/ProtectedRoutes";
import axios from "axios";
import { SocketContext } from "./redux/socketContext";

axios.defaults.baseURL = "http://localhost:8000";
// axios.defaults.baseURL = "https://ai-based-chat-app.onrender.com";
axios.defaults.withCredentials = true;

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoutes>
        <MainLayout />
      </ProtectedRoutes>
    ),
    children: [
      {
        path: "/",
        element: (
          <ProtectedRoutes>
            <Home />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/profile/:id",
        element: (
          <ProtectedRoutes>
            <Profile />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/account/edit",
        element: (
          <ProtectedRoutes>
            <EditProfile />
          </ProtectedRoutes>
        ),
      },
      {
        path: "/chat",
        element: (
          <ProtectedRoutes>
            <ChatPage />
          </ProtectedRoutes>
        ),
      },
      // Add new AI chat route
      {
        path: "/ai-chat",
        element: (
          <ProtectedRoutes>
            <AIChatPage />
          </ProtectedRoutes>
        ),
      },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
]);

function App() {
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      if (!socketRef.current) {
        const socketio = io("https://ai-based-chat-app.onrender.com", {
          query: {
            userId: user?._id,
          },
          transports: ["websocket"],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          autoConnect: true,
        });

        socketRef.current = socketio;

        socketio.on("connect", () => {
          console.log("Socket connected!");
        });

        socketio.on("connect_error", (err) => {
          console.log("Connection error:", err);
        });

        socketio.on("getOnlineUsers", (onlineUsers) => {
          dispatch(setOnlineUsers(onlineUsers));
        });

        socketio.on("notification", (notification) => {
          dispatch(setLikeNotification(notification));
        });
      }

      return () => {
        if (socketRef.current && !user) {
          socketRef.current.close();
          socketRef.current = null;
        }
      };
    }
  }, [user, dispatch]);

  return (
    <>
      <SocketContext.Provider value={socketRef.current}>
        <RouterProvider router={browserRouter} />
      </SocketContext.Provider>
    </>
  );
}

export default App;