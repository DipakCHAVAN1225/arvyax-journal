import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';
import JournalForm from '../components/JournalForm.jsx';
import EntryList from '../components/EntryList.jsx';
import InsightsPanel from '../components/InsightsPanel.jsx';
import Header from '../components/Header.jsx';
import styles from './JournalPage.module.css';

const TABS = [
  { id: 'write', label: 'Write', icon: '✦' },
  { id: 'entries', label: 'Entries', icon: '◈' },
  { id: 'insights', label: 'Insights', icon: '◉' },
];

export default function JournalPage({ userId, onLogout }) {
  const [activeTab, setActiveTab] = useState('write');
  const [entries, setEntries] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const data = await api.getEntries(userId, { limit: 50 });
      setEntries(data.entries);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingEntries(false);
    }
  }, [userId]);

  const fetchInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const data = await api.getInsights(userId);
      setInsights(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingInsights(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (activeTab === 'insights') fetchInsights();
  }, [activeTab, fetchInsights]);

  const handleEntryCreated = (newEntry) => {
    setEntries((prev) => [newEntry, ...prev]);
    showToast('Journal entry saved 🌿');
    setActiveTab('entries');
  };

  const handleEntryAnalyzed = (updatedEntry) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
    showToast('Analysis complete ✨');
  };

  return (
    <div className={styles.page}>
      <Header userId={userId} onLogout={onLogout} entryCount={entries.length} />

      <nav className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'entries' && entries.length > 0 && (
              <span className={styles.tabBadge}>{entries.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        {activeTab === 'write' && (
          <div className={styles.panel}>
            <JournalForm userId={userId} onCreated={handleEntryCreated} showToast={showToast} />
          </div>
        )}

        {activeTab === 'entries' && (
          <div className={styles.panel}>
            <EntryList
              entries={entries}
              loading={loadingEntries}
              onAnalyzed={handleEntryAnalyzed}
              showToast={showToast}
              onRefresh={fetchEntries}
            />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className={styles.panel}>
            <InsightsPanel
              insights={insights}
              loading={loadingInsights}
              onRefresh={fetchInsights}
            />
          </div>
        )}
      </main>

      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  );
}
