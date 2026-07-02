import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { media } from '../../styles/media';
import { useThemeMode } from '../../contexts/ThemeModeContext';
import { leadsApi, Lead } from '../../api/leads';
import { emailQueueApi, EmailItem } from '../../api/emailQueue';
import { tasksApi, TaskItem } from '../../api/services';

interface TopbarProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zh-TW', label: '繁中' },
  { code: 'zh-CN', label: '简中' },
];

/* ── NAV_ITEMS for page search ── */
const NAV_ITEMS = [
  { labelKey: 'nav.leadPool', path: '/cms-leads', icon: 'leads' },
  { labelKey: 'nav.leadSearch', path: '/cms-search', icon: 'search' },
  { labelKey: 'nav.outbox', path: '/cms-email-queue', icon: 'email' },
  { labelKey: 'nav.workflows', path: '/cms-tasks', icon: 'tasks' },
  { labelKey: 'nav.agents', path: '/cms-agents', icon: 'agent' },
  { labelKey: 'nav.team', path: '/cms-users', icon: 'users' },
  { labelKey: 'nav.settings', path: '/cms-settings', icon: 'settings' },
];

const NAV_ICON_PATHS: Record<string, string> = {
  leads: 'M7 14s-1 0-1-.5.5-2 3-2 3 1.5 3 2-.5.5-.5.5H7zm3-3a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  search: 'M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z',
  email: 'M15.964.686a.5.5 0 00-.65-.65L.767 5.855l-.452.18a.5.5 0 00-.082.887l.41.26 4.995 3.178 3.178 4.995.26.41a.5.5 0 00.886-.083l6-15z',
  tasks: 'M2 2a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V2a1 1 0 00-1-1H4z',
  agent: 'M6 12.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 004.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 01-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 013 9.219V8.062z',
  users: 'M15 14s1 0 1-.5-1-2-4-2-4 1.5-4 2 1 .5 1 .5h6zM12 8a2 2 0 100-4 2 2 0 000 4z',
  settings: 'M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z',
};

interface SearchResult {
  category: 'nav' | 'lead' | 'email' | 'task';
  label: string;
  sub?: string;
  path: string;
  icon: string;
  color: string;
}

/* ── Styled Components ── */

const Wrapper = styled.header`
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.canvas};
  position: sticky;
  top: 0;
  z-index: 10;
  gap: 12px;

  ${media.mobile} {
    padding-left: 56px;
  }
`;

const LeftGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

/* Hamburger -> Arrow animation */
const HamburgerBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  position: relative;

  /* Mobile: MobileHamburgerBtn in AppLayout handles the drawer. */
  ${media.mobile} {
    display: none;
  }
`;

const HamburgerIcon = styled.span<{ $collapsed?: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 22px;
  height: 18px;
  position: relative;

  .line {
    display: block;
    width: 22px;
    height: 2px;
    background: var(--primary, #567ebb);
    border-radius: 2px;
    transition: all 0.3s ease;
    position: absolute;
    left: 0;

    &:nth-child(1) { top: 0; }
    &:nth-child(2) { top: 8px; }
    &:nth-child(3) { top: 16px; }
  }

  /* Expanded -> hover shows LEFT arrow (<-, to collapse) */
  ${HamburgerBtn}:hover & {
    .line:nth-child(1) {
      width: 12px;
      transform: ${({ $collapsed }) => $collapsed
        ? 'translateX(10px) translateY(3px) rotate(45deg)'   /* right arrow top */
        : 'translateX(0px) translateY(3px) rotate(-45deg)'}; /* left arrow top */
    }
    .line:nth-child(2) {
      width: 22px;
    }
    .line:nth-child(3) {
      width: 12px;
      transform: ${({ $collapsed }) => $collapsed
        ? 'translateX(10px) translateY(-3px) rotate(-45deg)'  /* right arrow bottom */
        : 'translateX(0px) translateY(-3px) rotate(45deg)'};  /* left arrow bottom */
    }
  }
`;

/* Brand logo */
const BrandLink = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: ${({ theme }) => theme.fonts.display};
  font-weight: 400;
  font-size: 1.35rem;
  letter-spacing: 1.5px;
  white-space: nowrap;
`;

/* Phone icon from the MAD MAD logo */
const PhoneIcon = () => (
  <svg width="16" height="22" viewBox="0 0 16 22" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <rect x="3" y="4" width="10" height="12" rx="1" fill="currentColor" opacity="0.15" />
    <circle cx="8" cy="18.5" r="1" fill="currentColor" />
  </svg>
);

/* ── Search bar with icon + dropdown ── */

const SearchBar = styled.div`
  position: relative;
  flex: 1;
  max-width: 500px;
  display: flex;
  align-items: center;

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.textTertiary};
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  input {
    width: 100%;
    padding: 6px 14px 6px 34px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 20px;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textPrimary};
    background: ${({ theme }) => theme.colors.surface};
    outline: none;
    transition: border-color 0.15s;

    &::placeholder {
      color: ${({ theme }) => theme.colors.textTertiary};
    }
    &:focus {
      border-color: var(--primary, #567ebb);
    }
  }
`;

const SearchDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  z-index: 100;
`;

const SearchSectionLabel = styled.div`
  padding: 6px 12px;
  font-size: 0.625rem;
  text-transform: uppercase;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textTertiary};
  letter-spacing: 0.5px;
`;

const SearchDivider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: 4px 0;
`;

const SearchResultItem = styled.button`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }

  .item-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .item-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.textPrimary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-path {
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textTertiary};
    margin-left: auto;
    white-space: nowrap;
    flex-shrink: 0;
  }
`;

const SearchNoResult = styled.div`
  text-align: center;
  padding: 16px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Right group elements ── */

const RightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

const IconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: all 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const LangToggle = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: all 0.15s;
  user-select: none;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const LangBadge = styled.span`
  position: absolute;
  bottom: -1px;
  right: -4px;
  font-size: 0.5rem;
  font-weight: 700;
  line-height: 1;
  padding: 1px 3px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.border};
  pointer-events: none;
`;

/* Theme toggle (sun / moon) */
const ThemeToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: all 0.3s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  svg {
    transition: transform 0.3s ease;
  }
  &:hover svg {
    transform: rotate(20deg);
  }
`;

const ActionButton = styled.button`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radii.control}px;
  border: none;
  background: ${({ theme }) => theme.colors.blue};
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
`;

const UserAvatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--primary, #567ebb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
`;

/* ── SVG icon components ── */

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm2.802-3.5a6.959 6.959 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5h2.49zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
  </svg>
);

const NotifBellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
  </svg>
);

/* ── Component ── */

export const Topbar: React.FC<TopbarProps> = ({ title, actionLabel, onAction, onToggleSidebar, sidebarCollapsed }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { mode, toggle: toggleTheme } = useThemeMode();

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dataResults, setDataResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Language: click-to-cycle ── */
  const currentIdx = LANGUAGES.findIndex((l) => l.code === i18n.language);
  const currentLang = LANGUAGES[currentIdx >= 0 ? currentIdx : 0].label;

  const cycleLang = useCallback(() => {
    const idx = LANGUAGES.findIndex((l) => l.code === i18n.language);
    const nextIdx = (idx + 1) % LANGUAGES.length;
    i18n.changeLanguage(LANGUAGES[nextIdx].code);
  }, [i18n]);

  /* ── Nav items filtered by query ── */
  const filteredNav = useMemo<SearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return NAV_ITEMS
      .filter((item) => {
        const label = t(item.labelKey).toLowerCase();
        return label.includes(q) || item.path.toLowerCase().includes(q);
      })
      .map((item) => ({
        category: 'nav' as const,
        label: t(item.labelKey),
        path: item.path,
        icon: item.icon,
        color: '#2563eb',
      }));
  }, [searchQuery, t]);

  /* ── Fetch data from APIs ── */
  const fetchData = useCallback(async (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setDataResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const [leadsRes, emailsRes, tasksRes] = await Promise.allSettled([
        leadsApi.list({ search: q, limit: 5 }),
        emailQueueApi.list({ search: q, limit: 5 }),
        tasksApi.list(),
      ]);

      const results: SearchResult[] = [];

      // Leads
      if (leadsRes.status === 'fulfilled') {
        const leads: Lead[] = leadsRes.value.data?.data ?? [];
        leads.forEach((lead) => {
          results.push({
            category: 'lead',
            label: lead.company_name || lead.email || 'Unknown Lead',
            sub: lead.email || lead.phone || '',
            path: `/cms-leads/${lead._id}`,
            icon: 'leads',
            color: '#16a34a',
          });
        });
      }

      // Emails
      if (emailsRes.status === 'fulfilled') {
        const emails: EmailItem[] = emailsRes.value.data?.data ?? [];
        emails.forEach((email) => {
          results.push({
            category: 'email',
            label: email.subject || email.to_email || 'Untitled Email',
            sub: email.company_name || email.to_email || '',
            path: `/cms-email-queue/${email._id}`,
            icon: 'email',
            color: '#7c3aed',
          });
        });
      }

      // Tasks (client-side filter)
      if (tasksRes.status === 'fulfilled') {
        const allTasks: TaskItem[] = tasksRes.value.data?.data ?? tasksRes.value.data ?? [];
        const filtered = (Array.isArray(allTasks) ? allTasks : [])
          .filter((task) => {
            const haystack = [task.type, task.status, task._id, task.claimedBy]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return haystack.includes(q);
          })
          .slice(0, 5);

        filtered.forEach((task) => {
          results.push({
            category: 'task',
            label: task.type || task._id,
            sub: task.status || '',
            path: `/cms-tasks/${task._id}`,
            icon: 'tasks',
            color: '#e97a0a',
          });
        });
      }

      setDataResults(results);
    } catch {
      setDataResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /* ── Debounced query change ── */
  const handleQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setDataResults([]);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(value);
    }, 300);
  }, [fetchData]);

  /* ── Outside click to close dropdown ── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── Select a result ── */
  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.path);
    setSearchQuery('');
    setShowDropdown(false);
    setDataResults([]);
  }, [navigate]);

  /* ── Computed result groups ── */
  const allResults = useMemo(() => [...filteredNav, ...dataResults], [filteredNav, dataResults]);
  const navResults = allResults.filter((r) => r.category === 'nav');
  const leadResults = allResults.filter((r) => r.category === 'lead');
  const emailResults = allResults.filter((r) => r.category === 'email');
  const taskResults = allResults.filter((r) => r.category === 'task');

  const CATEGORY_LABELS: Record<string, string> = {
    nav: t('topbar.search.pages'),
    lead: t('topbar.search.leads'),
    email: t('topbar.search.emails'),
    task: t('topbar.search.tasks'),
  };

  /* ── Render a section of results ── */
  const renderSection = (label: string, items: SearchResult[], showDivider: boolean) => {
    if (items.length === 0) return null;
    return (
      <React.Fragment key={label}>
        {showDivider && <SearchDivider />}
        <SearchSectionLabel>{label}</SearchSectionLabel>
        {items.map((item, idx) => (
          <SearchResultItem key={`${item.category}-${item.path}-${idx}`} onClick={() => handleSelect(item)}>
            <span
              className="item-icon"
              style={{ background: `${item.color}18`, color: item.color }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d={NAV_ICON_PATHS[item.icon] || NAV_ICON_PATHS.search} />
              </svg>
            </span>
            <span className="item-label">{item.label}</span>
            <span className="item-path">{item.sub || item.path}</span>
          </SearchResultItem>
        ))}
      </React.Fragment>
    );
  };

  const hasAnyResults = allResults.length > 0;
  let sectionIdx = 0;

  return (
    <Wrapper>
      <LeftGroup>
        <HamburgerBtn onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <HamburgerIcon $collapsed={sidebarCollapsed}>
            <span className="line" />
            <span className="line" />
            <span className="line" />
          </HamburgerIcon>
        </HamburgerBtn>
        <BrandLink href="#"><PhoneIcon /> MAD MAD</BrandLink>
      </LeftGroup>

      <SearchBar ref={searchRef}>
        <span className="search-icon">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
        </span>
        <input
          type="text"
          placeholder={t('topbar.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
        />
        {showDropdown && searchQuery.trim() && (
          <SearchDropdown>
            {isSearching && !hasAnyResults && (
              <SearchNoResult>...</SearchNoResult>
            )}
            {renderSection(CATEGORY_LABELS.nav, navResults, (sectionIdx++ > 0 && navResults.length > 0) ? false : false)}
            {renderSection(CATEGORY_LABELS.lead, leadResults, navResults.length > 0 && leadResults.length > 0)}
            {renderSection(CATEGORY_LABELS.email, emailResults, (navResults.length > 0 || leadResults.length > 0) && emailResults.length > 0)}
            {renderSection(CATEGORY_LABELS.task, taskResults, (navResults.length > 0 || leadResults.length > 0 || emailResults.length > 0) && taskResults.length > 0)}
            {!isSearching && !hasAnyResults && (
              <SearchNoResult>{t('topbar.search.noResults')}</SearchNoResult>
            )}
          </SearchDropdown>
        )}
      </SearchBar>

      <RightGroup>
        <LangToggle title={t('topbar.language')} onClick={cycleLang}>
          <GlobeIcon />
          <LangBadge>{currentLang}</LangBadge>
        </LangToggle>
        <ThemeToggle onClick={toggleTheme} title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
          {mode === 'light' ? <MoonIcon /> : <SunIcon />}
        </ThemeToggle>
        <IconBtn title={t('topbar.notifications')}><NotifBellIcon /></IconBtn>
        <UserAvatar>MM</UserAvatar>
        {actionLabel && onAction && (
          <ActionButton onClick={onAction}>{actionLabel}</ActionButton>
        )}
      </RightGroup>
    </Wrapper>
  );
};

export default Topbar;
