'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, User, Upload } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.phone?.slice(-2) || '?';

  return (
    <header className="sticky top-0 z-40 bg-beige/80 backdrop-blur-md border-b border-border-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-terracotta rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LH</span>
          </div>
          <span className="font-display text-lg font-semibold text-midnight hidden sm:block">
            Long Health
          </span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Upload button */}
          <button
            onClick={() => router.push('/upload')}
            className="hidden sm:flex items-center gap-1.5 h-9 px-4 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta-dark transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Report
          </button>

          {/* Avatar / menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-sm font-medium text-text-secondary hover:border-terracotta/30 transition-colors"
            >
              {initials}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-border rounded-xl shadow-sm py-1.5 animate-fadeUp">
                <div className="px-4 py-2.5 border-b border-border-light">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-text-muted truncate">{user?.phone}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); router.push('/dashboard'); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-surface flex items-center gap-2.5 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red hover:bg-critical-bg flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
