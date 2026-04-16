"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  contenu: string;
  lu: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  pseudo: string | null;
  prenom: string | null;
  avatar_url: string | null;
}

interface Conversation {
  userId: string;
  profile: UserProfile | null;
  lastMessage: Message;
  unreadCount: number;
}

function displayName(profile: UserProfile | null) {
  return profile?.pseudo ?? profile?.prenom ?? "Utilisateur";
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withId = searchParams.get("with");
  const listingId = searchParams.get("listing");

  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(withId);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  // Mobile: "list" | "thread"
  const [mobileView, setMobileView] = useState<"list" | "thread">(withId ? "thread" : "list");
  const [isMobile, setIsMobile] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const activeUserIdRef = useRef<string | null>(withId);
  const currentUserRef = useRef<{ id: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function loadConversations(userId: string) {
    const { data: allMessages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!allMessages) return;

    const convMap: Record<string, { lastMessage: Message; unreadCount: number }> = {};
    for (const msg of allMessages) {
      const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
      if (!convMap[otherId]) {
        convMap[otherId] = { lastMessage: msg, unreadCount: 0 };
      }
      if (!msg.lu && msg.recipient_id === userId) {
        convMap[otherId].unreadCount++;
      }
    }

    const interlocutorIds = Object.keys(convMap);
    if (interlocutorIds.length === 0) { setConversations([]); return; }

    const { data: profiles } = await supabase
      .from("public_user_profiles")
      .select("id, pseudo, prenom, avatar_url")
      .in("id", interlocutorIds);

    const profileMap: Record<string, UserProfile> = {};
    for (const p of profiles ?? []) profileMap[p.id] = p;

    const convs: Conversation[] = interlocutorIds
      .map((id) => ({
        userId: id,
        profile: profileMap[id] ?? null,
        lastMessage: convMap[id].lastMessage,
        unreadCount: convMap[id].unreadCount,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime()
      );

    setConversations(convs);
  }

  async function loadThread(userId: string, otherId: string) {
    // On récupère les 100 plus récents (desc), puis on remet dans l'ordre chronologique
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`
      )
      .order("created_at", { ascending: false })
      .limit(100);

    const chrono = (msgs ?? []).slice().reverse();
    setMessages(chrono);
    setHasMoreMessages((msgs ?? []).length === 100);

    await supabase
      .from("messages")
      .update({ lu: true })
      .eq("sender_id", otherId)
      .eq("recipient_id", userId)
      .eq("lu", false);
  }

  async function loadOlderMessages() {
    if (!currentUser || !activeUserId || messages.length === 0 || loadingOlder) return;
    setLoadingOlder(true);

    const oldest = messages[0];
    const { data: older } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},recipient_id.eq.${currentUser.id})`
      )
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(100);

    const rows = (older ?? []).slice().reverse();
    setMessages((prev) => [...rows, ...prev]);
    if (rows.length < 100) setHasMoreMessages(false);
    setLoadingOlder(false);
  }

  // Init
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/connexion"); return; }
      setCurrentUser({ id: user.id });
      currentUserRef.current = { id: user.id };

      await loadConversations(user.id);

      if (withId) {
        const { data: profile } = await supabase
          .from("public_user_profiles")
          .select("id, pseudo, prenom, avatar_url")
          .eq("id", withId)
          .single();
        setActiveProfile(profile);

        if (listingId) {
          const { data: listing } = await supabase
            .from("listings")
            .select("titre")
            .eq("id", listingId)
            .single();
          if (listing) {
            setNewMessage(`Bonjour, je suis intéressé(e) par votre lot : ${listing.titre}`);
          }
        }

        await loadThread(user.id, withId);
      }

      setLoading(false);
    }
    init();
  }, []);

  // Load thread when activeUserId changes (after init)
  useEffect(() => {
    activeUserIdRef.current = activeUserId;
    if (currentUser && activeUserId) {
      loadThread(currentUser.id, activeUserId);
    }
  }, [activeUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime : écoute les nouveaux messages entrants
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`messages-realtime-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          const me = currentUserRef.current;
          if (!me) return;

          const activeId = activeUserIdRef.current;

          // Si le message vient de la conversation active, on recharge le thread (append + mark as read)
          if (activeId && newMsg.sender_id === activeId) {
            loadThread(me.id, activeId);
          }
          // Toujours refresh la liste des conversations (last message + unread count)
          loadConversations(me.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  async function handleSend() {
    if (!newMessage.trim() || !currentUser || !activeUserId || sending) return;
    setSending(true);

    const contenu = newMessage.trim();
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUser.id,
      recipient_id: activeUserId,
      contenu,
      lu: false,
    });

    if (!error) {
      setNewMessage("");
      await loadThread(currentUser.id, activeUserId);
      await loadConversations(currentUser.id);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/messages/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              sender_id: currentUser.id,
              recipient_id: activeUserId,
              contenu: contenu.slice(0, 50),
            }),
          });
        }
      } catch (err) {
        console.error("[messages] notify error:", err);
      }
    }
    setSending(false);
  }

  function openConversation(conv: Conversation) {
    setActiveUserId(conv.userId);
    activeUserIdRef.current = conv.userId;
    setActiveProfile(conv.profile);
    setMobileView("thread");
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-white">
        <p className="text-gray-500">Chargement…</p>
      </div>
    );
  }

  /* ── Conversation list panel ── */
  const listVisibility = isMobile
    ? mobileView === "list" ? "block" : "hidden"
    : "block";

  const conversationList = (
    <div
      className={`h-full flex-shrink-0 overflow-y-auto ${listVisibility} ${
        isMobile ? "w-full" : "w-[300px] min-w-[300px] border-r border-gray-200"
      }`}
    >
      {conversations.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">
          Aucune conversation pour le moment.
        </div>
      ) : (
        conversations.map((conv) => {
          const name = displayName(conv.profile);
          const isActive = activeUserId === conv.userId;
          return (
            <div
              key={conv.userId}
              onClick={() => openConversation(conv)}
              className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 px-5 py-3.5 ${
                isActive ? "bg-[#fff7ed]" : "bg-white"
              }`}
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#FF7D07]">
                <span className="text-lg font-bold text-white">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{name}</span>
                  <span className="flex-shrink-0 text-[11px] text-gray-400">
                    {formatTime(conv.lastMessage.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="m-0 flex-1 truncate text-xs text-gray-500">
                    {conv.lastMessage.contenu.length > 38
                      ? conv.lastMessage.contenu.slice(0, 38) + "…"
                      : conv.lastMessage.contenu}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 rounded-full bg-[#FF7D07] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  /* ── Thread panel ── */
  const threadVisibility = isMobile
    ? mobileView === "thread" ? "flex" : "hidden"
    : "flex";

  const threadPanel = (
    <div
      className={`min-w-0 flex-1 flex-col overflow-hidden ${threadVisibility} ${
        isMobile ? "w-full" : ""
      }`}
    >
      {!activeUserId ? (
        <div className="flex flex-1 items-center justify-center text-[15px] text-gray-400">
          Sélectionnez une conversation
        </div>
      ) : (
        <>
          {/* Thread header */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-5 py-3.5">
            {isMobile && (
              <button
                onClick={() => setMobileView("list")}
                className="cursor-pointer border-none bg-transparent pr-1 text-lg font-bold leading-none text-[#FF7D07]"
                aria-label="Retour"
              >
                ←
              </button>
            )}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FF7D07]">
              <span className="text-sm font-bold text-white">
                {displayName(activeProfile).charAt(0).toUpperCase()}
              </span>
            </div>
            <a
              href={`/vendeur/${activeUserId}`}
              className="text-base font-semibold text-gray-900 no-underline"
            >
              {displayName(activeProfile)}
            </a>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4">
            {hasMoreMessages && messages.length > 0 && (
              <button
                onClick={loadOlderMessages}
                disabled={loadingOlder}
                className="mb-2 self-center rounded-full border border-gray-300 bg-transparent px-4 py-1.5 text-[11px] font-semibold text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingOlder ? "Chargement…" : "↑ Messages plus anciens"}
              </button>
            )}
            {messages.length === 0 ? (
              <p className="mt-12 text-center text-sm text-gray-400">
                Aucun message. Commencez la conversation !
              </p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] break-words px-3.5 py-2 text-sm leading-normal ${
                        isMe
                          ? "rounded-[14px_14px_4px_14px] bg-[#FF7D07] text-white"
                          : "rounded-[14px_14px_14px_4px] bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="mb-0.5 m-0">{msg.contenu}</p>
                      <p className="m-0 text-right text-[10px] opacity-70">
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex flex-shrink-0 items-end gap-2.5 border-t border-gray-200 px-5 py-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Écrire un message…"
              rows={2}
              className="box-border flex-1 resize-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D07]"
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className={`flex-shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold ${
                !newMessage.trim() || sending
                  ? "cursor-not-allowed bg-gray-200 text-gray-400"
                  : "cursor-pointer bg-[#FF7D07] text-white"
              }`}
            >
              {sending ? "…" : "Envoyer"}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-white">
      {/* Header de page — masqué sur mobile quand on est dans le thread */}
      {(!isMobile || mobileView === "list") && (
        <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
          <h1 className="m-0 text-2xl font-bold text-gray-900">Messages</h1>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {conversationList}
        {threadPanel}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-white">
          <p className="text-gray-500">Chargement…</p>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
