import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { connectSocket } from "../lib/socket";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import NewGroupModal from "../components/NewGroupModal";
import GroupInfoModal from "../components/GroupInfoModal";

const RANK = { sent: 0, delivered: 1, seen: 2 };

// Kisi bhi list (users ya groups) mein ek item ko id se update karo
const patcher = (setter) => (id, patch) =>
  setter((prev) =>
    prev.map((x) =>
      x._id === id ? { ...x, ...(typeof patch === "function" ? patch(x) : patch) } : x
    )
  );

export default function Chat() {
  const { user: me, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeId, setActiveId] = useState(null); // user ya group, dono ki id alag hoti hai
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState({});
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [modal, setModal] = useState(null); // "new-group" | "group-info"

  const socketRef = useRef(null);
  const activeRef = useRef(null);
  const usersRef = useRef([]);
  const groupsRef = useRef([]);
  usersRef.current = users;
  groupsRef.current = groups;

  const patchUser = patcher(setUsers);
  const patchGroup = patcher(setGroups);

  // Server se aaye users: name na ho to email se naam bana do (crash se bachne ke liye)
  const normalizeUser = (u) => {
    if (!u.name) console.warn("[chat] user without a name in database:", u);
    return { ...u, name: u.name || u.email?.split("@")[0] || "Unknown user" };
  };

  const loadUsers = useCallback(
    () =>
      api
        .get("/users")
        .then((res) => {
          const list = Array.isArray(res.data?.users) ? res.data.users : [];
          setUsers(list.map(normalizeUser));
        })
        .catch((err) => console.error("[chat] could not load users:", err.message)),
    []
  );

  const loadGroups = useCallback(
    () =>
      api
        .get("/groups")
        .then((res) => setGroups(Array.isArray(res.data?.groups) ? res.data.groups : []))
        .catch((err) => console.error("[chat] could not load groups:", err.message)),
    []
  );

  // Group naya ho to add karo, purana ho to sirf naam/members/admin update karo
  const upsertGroup = (g) =>
    setGroups((prev) =>
      prev.some((x) => x._id === g._id)
        ? prev.map((x) => (x._id === g._id ? { ...x, name: g.name, admin: g.admin, members: g.members } : x))
        : [...prev, { ...g, lastMessage: g.lastMessage ?? null, unread: g.unread ?? 0 }]
    );

  // Group list se hatao (leave / removed). Khula ho to band kar do
  const dropGroup = (groupId) => {
    setGroups((prev) => prev.filter((g) => g._id !== groupId));
    if (activeRef.current === groupId) {
      activeRef.current = null;
      setActiveId(null);
      setMessages([]);
    }
    setModal(null);
  };

  // Socket connect + saare realtime events
  useEffect(() => {
    loadUsers();
    loadGroups();
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on("users:online", (ids) =>
      setUsers((prev) => prev.map((u) => ({ ...u, isOnline: ids.includes(u._id) })))
    );

    socket.on("user:status", ({ userId, isOnline, lastSeen }) => {
      // Naya user aaya jo list mein nahi hai to list dobara load karo
      if (!usersRef.current.some((u) => u._id === userId)) return loadUsers();
      patchUser(userId, { isOnline, ...(lastSeen && { lastSeen }) });
    });

    socket.on("message:new", (msg) => {
      const mine = msg.sender === me._id;

      // Group message
      if (msg.group) {
        const isOpen = activeRef.current === msg.group;
        if (isOpen) {
          setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
          socket.emit("group:read", { groupId: msg.group });
        }
        patchGroup(msg.group, (g) => ({
          lastMessage: msg,
          unread: !mine && !isOpen ? (g.unread || 0) + 1 : g.unread,
        }));
        return;
      }

      // Direct message
      const other = mine ? msg.receiver : msg.sender;
      if (!usersRef.current.some((u) => u._id === other)) loadUsers();

      const isOpen = activeRef.current === other;
      if (isOpen) {
        setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
        if (!mine) socket.emit("message:seen", { from: other });
      }
      patchUser(other, (u) => ({
        lastMessage: msg,
        unread: !mine && !isOpen ? (u.unread || 0) + 1 : u.unread,
      }));
      if (!mine) setTyping((t) => ({ ...t, [other]: false }));
    });

    // Edit / delete / reaction: message ko jagah par update karo
    socket.on("message:updated", (msg) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === msg._id) return msg;
          // Jin messages ne isko reply kiya hai, unka quote bhi update ho
          if (m.replyTo?._id === msg._id)
            return { ...m, replyTo: { ...m.replyTo, text: msg.text, deleted: msg.deleted } };
          return m;
        })
      );
      const touchLast = (prev) => prev.map((x) => (x.lastMessage?._id === msg._id ? { ...x, lastMessage: msg } : x));
      setUsers(touchLast);
      setGroups(touchLast);
    });

    socket.on("group:updated", upsertGroup);
    socket.on("group:removed", ({ groupId }) => dropGroup(groupId));

    socket.on("typing", ({ from, isTyping }) => setTyping((t) => ({ ...t, [from]: isTyping })));

    // delivered / seen ticks update
    socket.on("messages:status", ({ by, status }) => {
      if (activeRef.current !== by) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.sender === me._id && m.receiver === by && RANK[m.status] < RANK[status]
            ? { ...m, status }
            : m
        )
      );
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me._id]);

  // Koi chat kholna (user ya group). isGroupHint tab chahiye jab group abhi bana ho
  const selectChat = async (id, isGroupHint) => {
    const isGroup = isGroupHint ?? groupsRef.current.some((g) => g._id === id);
    activeRef.current = id;
    setActiveId(id);
    setMessages([]);
    setLoadingMsgs(true);
    (isGroup ? patchGroup : patchUser)(id, { unread: 0 });
    try {
      const { data } = await api.get(isGroup ? `/messages/group/${id}` : `/messages/${id}`);
      if (activeRef.current === id) setMessages(data.messages);
    } finally {
      setLoadingMsgs(false);
    }
    if (isGroup) socketRef.current?.emit("group:read", { groupId: id });
    else socketRef.current?.emit("message:seen", { from: id });
  };

  const goBack = () => {
    activeRef.current = null;
    setActiveId(null);
  };

  const activeGroup = groups.find((g) => g._id === activeId) || null;
  const activeUser = users.find((u) => u._id === activeId) || null;

  // ---- Group actions (REST), baqi members ko socket se khabar milti hai ----
  const createGroup = async (name, memberIds) => {
    const { data } = await api.post("/groups", { name, memberIds });
    upsertGroup(data.group);
    setModal(null);
    selectChat(data.group._id, true);
  };

  const renameGroup = async (id, name) => {
    const { data } = await api.patch(`/groups/${id}`, { name });
    upsertGroup(data.group);
  };

  const addMembers = async (id, userIds) => {
    const { data } = await api.post(`/groups/${id}/members`, { userIds });
    upsertGroup(data.group);
  };

  const removeMember = async (groupId, userId) => {
    const { data } = await api.delete(`/groups/${groupId}/members/${userId}`);
    if (userId === me._id) dropGroup(groupId);
    else if (data.group) upsertGroup(data.group);
  };

  // ---- Uploads: Cloudinary par, server ke raaste ----
  const uploadFile = async (path, field, file, onProgress) => {
    const form = new FormData();
    form.append(field, file);
    const { data } = await api.post(path, form, {
      onUploadProgress: (e) => e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
    });
    return data;
  };

  const uploadImage = async (file, onProgress) =>
    (await uploadFile("/upload", "image", file, onProgress)).image;

  const uploadAudio = async (blob, onProgress) => {
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const file = new File([blob], `voice.${ext}`, { type: blob.type });
    return (await uploadFile("/upload/audio", "audio", file, onProgress)).audio;
  };

  // ---- Messages ----
  const sendMessage = (text, replyTo, image, audio) => {
    const to = activeId;
    const isGroup = !!activeGroup;
    const payload = {
      text,
      replyTo: replyTo || null,
      image: image || null,
      audio: audio || null,
      ...(isGroup ? { groupId: to } : { to }),
    };
    socketRef.current?.emit("message:send", payload, (res) => {
      if (!res?.message) return console.error("[chat]", res?.error);
      if (activeRef.current === to)
        setMessages((prev) =>
          prev.some((m) => m._id === res.message._id) ? prev : [...prev, res.message]
        );
      (isGroup ? patchGroup : patchUser)(to, { lastMessage: res.message });
    });
  };

  // Edit, delete aur reaction: server se confirm hone par "message:updated" aata hai
  const logError = (res) => res?.error && console.error("[chat]", res.error);
  const editMessage = (id, text) => socketRef.current?.emit("message:edit", { id, text }, logError);
  const deleteMessage = (id) => socketRef.current?.emit("message:delete", { id }, logError);
  const reactToMessage = (id, emoji) =>
    socketRef.current?.emit("message:react", { id, emoji }, logError);

  const sendTyping = (isTyping) => {
    if (activeUser) socketRef.current?.emit("typing", { to: activeId, isTyping });
  };

  return (
    <div className="h-dvh bg-mist dark:bg-ink-900 md:p-5">
      <div className="mx-auto flex h-full max-w-[1400px] overflow-hidden bg-white dark:bg-ink-800 md:rounded-3xl md:border md:border-slate-200/80 md:shadow-xl md:shadow-brand-900/10 dark:md:border-ink-600">
        <aside
          className={`${
            activeId ? "hidden md:flex" : "flex"
          } w-full flex-col border-r border-slate-200 dark:border-ink-600 md:w-[22rem] md:shrink-0`}
        >
          <Sidebar
            me={me}
            users={users}
            groups={groups}
            activeId={activeId}
            typing={typing}
            onSelect={selectChat}
            onLogout={logout}
            onNewGroup={() => setModal("new-group")}
          />
        </aside>

        <main className={`${activeId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
          <ChatWindow
            me={me}
            user={activeUser}
            group={activeGroup}
            messages={messages}
            typing={activeUser ? !!typing[activeUser._id] : false}
            loading={loadingMsgs}
            onSend={sendMessage}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onReact={reactToMessage}
            onUploadImage={uploadImage}
            onUploadAudio={uploadAudio}
            onTyping={sendTyping}
            onBack={goBack}
            onOpenInfo={() => setModal("group-info")}
          />
        </main>
      </div>

      {modal === "new-group" && (
        <NewGroupModal users={users} onClose={() => setModal(null)} onCreate={createGroup} />
      )}
      {modal === "group-info" && activeGroup && (
        <GroupInfoModal
          group={activeGroup}
          me={me}
          users={users}
          onClose={() => setModal(null)}
          onRename={renameGroup}
          onAdd={addMembers}
          onRemove={removeMember}
        />
      )}
    </div>
  );
}
