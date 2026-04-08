import { RequestHandler } from 'express';
import Chat from '../model/chat';
import UserChats from '../model/userChats';
import { queryRAG } from '../utils/queryRAG';
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';

const USER_ID = "testUser";

export const createChat: RequestHandler = async (req, res) => {
    const { text } = req.body;
    if (!text) {
        console.log("Request rejected: Empty text received");
        res.status(400).send("Text is required");
        return;
    }

    try {
        const newChat = new Chat({
            userId: USER_ID,
            history: [{ role: "user", parts: [{ text }] }],
        });
        const savedChat = await newChat.save();
        console.log("New chat created:", {
            chatId: savedChat._id.toString(),
            initialText: text,
        });

        let userChats = await UserChats.findOne({ userId: USER_ID });
        if (!userChats) {
            userChats = new UserChats({
                userId: USER_ID,
                chats: [
                    {
                        _id: savedChat._id.toString(),
                        title: text.substring(0, 40),
                    },
                ],
            });
            console.log("Created new UserChats document for user:", USER_ID);
        } else {
            userChats.chats.push({
                _id: savedChat._id.toString(),
                title: text.substring(0, 40),
            });
            console.log("Added chat to existing UserChats document");
        }
        await userChats.save();

        // Return immediately so the frontend can navigate to the chat
        res.status(201).send(savedChat._id.toString());

        // Process RAG in background
        queryRAG(text)
            .then(async (response) => {
                const answer = response.data?.answer;
                if (answer) {
                    await Chat.updateOne(
                        { _id: savedChat._id, userId: USER_ID },
                        { $push: { history: { role: "model", parts: [{ text: answer }] } } }
                    );
                    console.log("Chat updated with RAG response:", savedChat._id.toString());
                }
            })
            .catch((err) => console.error("Background RAG error:", err));

    } catch (err) {
        console.error("Error in createChat:", err);
        res.status(500).send("Error creating chat!");
    }
};

export const deleteChat: RequestHandler = async (req, res) => {
    const { id } = req.params;
    const USER_ID = "testUser";
    try {
        await Chat.deleteOne({ _id: id, userId: USER_ID });
        await UserChats.updateOne(
            { userId: USER_ID },
            { $pull: { chats: { _id: id } } }
        );
        res.status(200).send("Chat deleted successfully");
    } catch (err) {
        console.error("Error deleting chat:", err);
        res.status(500).send("Error deleting chat");
    }
};

export const getUserChats: RequestHandler = async (req, res) => {
    try {
        const userChats = await UserChats.findOne({ userId: USER_ID });
        res.status(200).send(userChats?.chats || []);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching userchats!");
    }
};

export const getChat: RequestHandler = asyncHandler(async (req, res, next) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.id, userId: USER_ID });
        if (!chat) {
            res.status(404).send("Chat not found");
            return;
        }
        res.status(200).send(chat);
        return;
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching chat!");
        return;
    }
});

export const updateChat: RequestHandler = async (req, res) => {
    const { question, img } = req.body;
    if (!question) {
        res.status(400).send("Question is required");
        return;
    }

    try {
        await Chat.updateOne(
            { _id: req.params.id, userId: USER_ID },
            {
                $push: {
                    history: {
                        role: "user",
                        parts: [{ text: question }],
                        ...(img && { img })
                    }
                },
            }
        );

        // Return immediately so the frontend stops showing the loader
        res.status(200).send("ok");

        // Process RAG in background
        queryRAG(question)
            .then(async (response) => {
                const answer = response.data?.answer || "No answer";
                await Chat.updateOne(
                    { _id: req.params.id, userId: USER_ID },
                    { $push: { history: { role: "model", parts: [{ text: answer }] } } }
                );
                console.log("Chat updated with RAG response:", req.params.id);
            })
            .catch((err) => console.error("Background RAG error:", err));

    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding conversation!");
    }
};
