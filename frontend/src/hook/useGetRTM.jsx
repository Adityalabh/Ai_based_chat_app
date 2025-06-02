import { setMessages } from "@/redux/chatSlice";
import { useContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SocketContext } from '../redux/socketContext';

const useGetRTM = () => {
    const dispatch = useDispatch();
    // const { socket } = useSelector(store => store.socketio);
    const { messages } = useSelector(store => store.chat);
     const socket = useContext(SocketContext);

    // useEffect(() => {
    //     socket?.on('newMessage', (newMessage) => {
    //         dispatch(setMessages([...messages, newMessage]));
    //     })

    //     return () => {
    //         socket?.off('newMessage');
    //     }
    // }, [messages, setMessages]);

      useEffect(() => {
        if (!socket) return;

        const messageHandler = (newMessage) => {
            dispatch(setMessages([...messages, newMessage]));
        };

        socket.on('newMessage', messageHandler);

        return () => {
            socket.off('newMessage', messageHandler);
        }
    }, [messages, socket, dispatch]);
};
export default useGetRTM;