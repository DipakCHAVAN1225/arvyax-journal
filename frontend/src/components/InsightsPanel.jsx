import styles from './InsightsPanel.module.css';

const AMBIENCE_ICONS = {
  forest: '🌲', ocean: '🌊', mountain: '⛰️', desert: '🌵', meadow: '🌿',
};

const EMOTION_COLORS = {
  calm: '#4a7c6e', joyful: '#c4a030', anxious: '#8a4a4a', peaceful: '#5a7d8a',
  energized: '#7a8a3a', melancholic: '#6a5a7a', grateful: '#7a6a4a',
  reflective: '#5a6a7a', hopeful: '#6a8a6a', overwhelmed: '#8a5a4a',
};

function StatCard({ value, label, icon, accent }) {
  return (
    <div className={styles.statCard} style={accent ? { '--accent': accent } : {}}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value ?? '—'}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function EmotionBar({ emotion, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = EMOTION_COLORS[emotion] || '#6a7a6a';
  return (
    <div className={styles.emotionRow}>
      <span className={styles.emotionName}>{emotion}</span>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className={styles.emotionPct}>{pct}%</span>
      <span className={styles.emotionCount}>{count}×</span>
    </div>
  );
}

function AmbienceDonut({ ambienceBreakdown, total }) {
  if (!ambienceBreakdown || total === 0) return null;

  const entries = Object.entries(ambienceBreakdown);
  const COLORS = {
    forest: '#3d5a3e', ocean: '#2d5a6e', mountain: '#5a4e6e',
    desert: '#8a6040', meadow: '#6a7a3a',
  };

  // Simple stacked bar
  return (
    <div className={styles.ambienceBreakdown}>
      <div className={styles.ambienceBar}>
        {entries.map(([amb, count]) => (
          <div
            key={amb}
            className={styles.ambienceSegment}
            style={{
              width: `${(count / total) * 100}%`,
              background: COLORS[amb] || '#6a7a6a',
            }}
            title={`${amb}: ${count}`}
          />
        ))}
      </div>
      <div className={styles.ambienceLegend}>
        {entries.map(([amb, count]) => (
          <span key={amb} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: COLORS[amb] || '#6a7a6a' }} />
            <span>{AMBIENCE_ICONS[amb]} {amb}</span>
            <span className={styles.legendCount}>{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPanel({ insights, loading, onRefresh }) {
  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingIcon}>◉</div>
        <p>Weaving your insights...</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyIcon}>🌾</p>
        <p className={styles.emptyTitle}>No insights yet</p>
        <p>Start journaling to see your patterns emerge.</p>
      </div>
    );
  }

  const {
    totalEntries, topEmotion, mostUsedAmbience, recentKeywords,
    emotionBreakdown = {}, ambienceBreakdown = {}, recentEntries, analyzedEntries,
  } = insights;

  const totalEmotionCount = Object.values(emotionBreakdown).reduce((a, b) => a + b, 0);
  const sortedEmotions = Object.entries(emotionBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>Your Insights</h2>
        <button className={styles.refreshBtn} onClick={onRefresh} title="Refresh insights">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M13 2v4H9M1 12V8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.5 5A5.5 5.5 0 0112 9M11.5 9a5.5 5.5 0 01-9.5-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {totalEntries === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyIcon}>🌱</p>
          <p className={styles.emptyTitle}>Plant your first seed</p>
          <p>Write your first journal entry to begin uncovering patterns.</p>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className={styles.statsGrid}>
            <StatCard
              value={totalEntries}
              label="Total Entries"
              icon="◈"
              accent="var(--moss)"
            />
            <StatCard
              value={recentEntries}
              label="This Week"
              icon="◷"
              accent="var(--fern)"
            />
            <StatCard
              value={analyzedEntries ?? '—'}
              label="Analyzed"
              icon="✦"
              accent="var(--dusk)"
            />
            <StatCard
              value={mostUsedAmbience ? `${AMBIENCE_ICONS[mostUsedAmbience]} ${mostUsedAmbience}` : '—'}
              label="Top Ambience"
              icon="◎"
              accent="var(--bark-light)"
            />
          </div>

          {/* Top emotion highlight */}
          {topEmotion && (
            <div
              className={styles.topEmotionCard}
              style={{ '--em-color': EMOTION_COLORS[topEmotion] || '#4a7c6e' }}
            >
              <div className={styles.topEmotionLabel}>Predominant Emotion</div>
              <div className={styles.topEmotionValue}>{topEmotion}</div>
              <div className={styles.topEmotionDesc}>
                This emotion appears most frequently across your analyzed entries.
              </div>
            </div>
          )}

          {/* Emotion breakdown */}
          {sortedEmotions.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Emotion Landscape</h3>
              <div className={styles.emotionList}>
                {sortedEmotions.map(([emotion, count]) => (
                  <EmotionBar
                    key={emotion}
                    emotion={emotion}
                    count={count}
                    total={totalEmotionCount}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Ambience breakdown */}
          {Object.keys(ambienceBreakdown).length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Nature Environments</h3>
              <AmbienceDonut ambienceBreakdown={ambienceBreakdown} total={totalEntries} />
            </section>
          )}

          {/* Recent keywords */}
          {recentKeywords?.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Recent Themes</h3>
              <div className={styles.keywords}>
                {recentKeywords.map((kw, i) => (
                  <span
                    key={kw}
                    className={styles.keyword}
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
