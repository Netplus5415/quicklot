"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Navigation() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function fetchUnread(uid: string) {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", uid)
      .eq("lu", false);
    setUnreadCount(count ?? 0);
  }

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setConnected(!!user);
      if (user) {
        setUserId(user.id);
        fetchUnread(user.id);
      }
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setConnected(!!session?.user);
      if (session?.user) {
        setUserId(session.user.id);
        fetchUnread(session.user.id);
      } else {
        setUserId(null);
        setUnreadCount(0);
      }
    });

    function handleResize() {
      const isMob = window.innerWidth < 640;
      setMobile(isMob);
      if (!isMob) setMenuOpen(false);
    }
    handleResize();
    window.addEventListener("resize", handleResize);

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Realtime : badge messages non lus — souscrit aux INSERT dont le user est destinataire
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`nav-unread-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          fetchUnread(userId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          // couvre le cas où les messages sont marqués comme lus depuis /messages
          fetchUnread(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Classes réutilisables
  const linkClass =
    "text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap";
  const dropItemClass =
    "flex w-full items-center gap-2 border-b border-gray-100 px-6 py-3.5 text-left text-base font-medium text-gray-700 hover:bg-gray-50 last:border-b-0";
  const badgeClass =
    "inline-flex items-center justify-center rounded-full bg-[#FF7D07] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white";

  /* ── Desktop nav ── */
  const desktopNav = (
    <div className="flex items-center gap-6">
      <Link href="/boutique" className={linkClass}>
        Catalogue
      </Link>
      {connected ? (
        <>
          <Link href="/dashboard" className={linkClass}>
            Dashboard
          </Link>
          <Link href="/dashboard/commandes" className={linkClass}>
            Mes ventes
          </Link>
          <Link href="/dashboard/acheteur" className={linkClass}>
            Mes achats
          </Link>
          <Link href="/dashboard/profil" className={linkClass}>
            Mon profil
          </Link>
          <Link href="/messages" className={`${linkClass} inline-flex items-center gap-1.5`}>
            Messages
            {unreadCount > 0 && (
              <span className={badgeClass}>{unreadCount > 99 ? "99+" : unreadCount}</span>
            )}
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            Déconnexion
          </button>
        </>
      ) : (
        <Link href="/connexion" className={linkClass}>
          Connexion
        </Link>
      )}
    </div>
  );

  /* ── Mobile hamburger ── */
  const mobileNav = (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Menu"
        className="relative flex cursor-pointer items-center justify-center border-none bg-transparent p-1"
      >
        <div className="flex flex-col gap-[5px]">
          <span className="block h-0.5 w-[23px] rounded-sm bg-gray-700" />
          <span className="block h-0.5 w-[23px] rounded-sm bg-gray-700" />
          <span className="block h-0.5 w-[23px] rounded-sm bg-gray-700" />
        </div>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-px h-2.5 w-2.5 rounded-full border-2 border-white bg-[#FF7D07]" />
        )}
      </button>

      {menuOpen && (
        <div className="fixed inset-x-0 top-14 z-[99] flex flex-col border-b border-gray-200 bg-white shadow-lg">
          <Link href="/boutique" className={dropItemClass} onClick={() => setMenuOpen(false)}>
            Catalogue
          </Link>
          {connected ? (
            <>
              <Link href="/dashboard" className={dropItemClass} onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <Link href="/dashboard/commandes" className={dropItemClass} onClick={() => setMenuOpen(false)}>
                Mes ventes
              </Link>
              <Link href="/dashboard/acheteur" className={dropItemClass} onClick={() => setMenuOpen(false)}>
                Mes achats
              </Link>
              <Link href="/dashboard/profil" className={dropItemClass} onClick={() => setMenuOpen(false)}>
                Mon profil
              </Link>
              <Link href="/messages" className={dropItemClass} onClick={() => setMenuOpen(false)}>
                Messages
                {unreadCount > 0 && (
                  <span className={`${badgeClass} ml-auto`}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                className={`${dropItemClass} cursor-pointer border-0 bg-transparent`}
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link href="/connexion" className={dropItemClass} onClick={() => setMenuOpen(false)}>
              Connexion
            </Link>
          )}
        </div>
      )}
    </div>
  );

  return (
    <nav className="fixed inset-x-0 top-0 z-[100] flex h-14 items-center gap-2 border-b border-[#FF7D07] bg-white px-4 font-sans sm:px-8">
      <Link
        href="/"
        className="mr-auto whitespace-nowrap text-base font-bold tracking-tight text-gray-900 sm:text-lg"
      >
        Quicklot
      </Link>
      {connected === null ? null : mobile ? mobileNav : desktopNav}
    </nav>
  );
}
