import { ArrowUpRight, CalendarDays, CircleHelp, Ellipsis, Plus } from 'lucide-react';
import styles from '@/app/marketing.module.css';

const stats = [
  { label: 'Active jobs', value: '24', change: '+3 this month', up: true },
  { label: 'Candidates', value: '1,284', change: '+12.8%', up: true },
  { label: 'Applications', value: '356', change: '+8.2%', up: true },
  { label: 'Interviews', value: '48', change: 'This week', up: false },
];

const candidates = [
  { initials: 'SC', name: 'Sofia Chen', role: 'Product Designer', tone: 'violet', time: 'Today, 10:30' },
  { initials: 'JM', name: 'James Miller', role: 'Senior Engineer', tone: 'blue', time: 'Today, 11:45' },
  { initials: 'AR', name: 'Aisha Rahman', role: 'Product Manager', tone: 'green', time: 'Tomorrow, 09:00' },
];

const pipeline = [
  { name: 'Applied', count: 128, width: '100%', tone: 'pipeOne' },
  { name: 'Screening', count: 74, width: '72%', tone: 'pipeTwo' },
  { name: 'Interview', count: 42, width: '48%', tone: 'pipeThree' },
  { name: 'Offer', count: 18, width: '28%', tone: 'pipeFour' },
];

export function DashboardPreview() {
  return (
    <div className={styles.previewShell} role="img" aria-label="Illustrative OpenATS dashboard showing sample recruitment metrics, a hiring pipeline and upcoming interviews">
      <div className={styles.previewTopbar}>
        <div className={styles.previewBrand}><span className={styles.previewBrandMark}>o</span> openats <span className={styles.previewWorkspace}>/ Workspace</span></div>
        <div className={styles.previewTopActions}><span className={styles.samplePill}>Illustrative data</span><span className={styles.previewAvatar}>JD</span></div>
      </div>
      <div className={styles.previewBody}>
        <aside className={styles.previewSidebar}>
          <span className={styles.sidebarLabel}>Workspace</span>
          <div className={styles.sidebarItemActive}>▦ <span>Overview</span></div>
          <div className={styles.sidebarItem}>▤ <span>Jobs</span></div>
          <div className={styles.sidebarItem}>♙ <span>Candidates</span></div>
          <div className={styles.sidebarItem}>◷ <span>Interviews</span></div>
          <div className={styles.sidebarItem}>▥ <span>Reports</span></div>
          <div className={styles.sidebarBottom}>Team workspace</div>
        </aside>
        <div className={styles.previewMain}>
          <div className={styles.previewHeading}>
            <div><span className={styles.previewEyebrow}>SAMPLE WORKSPACE</span><h3>Good morning, Jordan</h3><p>Here’s what’s happening with your hiring.</p></div>
            <button type="button" className={styles.previewAdd} tabIndex={-1} aria-hidden="true"><Plus size={13} /> New job</button>
          </div>
          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div className={styles.statCard} key={stat.label}>
                <span>{stat.label}</span><strong>{stat.value}</strong>
                <small className={stat.up ? styles.positive : styles.neutral}>{stat.up ? <ArrowUpRight size={11} /> : <CalendarDays size={11} />}{stat.change}</small>
              </div>
            ))}
          </div>
          <div className={styles.previewLower}>
            <section className={styles.previewPanel}>
              <div className={styles.panelHeading}><div><strong>Hiring pipeline</strong><span>Candidate progression</span></div><Ellipsis size={17} /></div>
              <div className={styles.pipelineList}>
                {pipeline.map((item) => (
                  <div className={styles.pipelineRow} key={item.name}>
                    <div><span>{item.name}</span><b>{item.count}</b></div>
                    <div className={styles.pipelineTrack}><i className={styles[item.tone as keyof typeof styles]} style={{ width: item.width }} /></div>
                  </div>
                ))}
              </div>
            </section>
            <section className={styles.previewPanel}>
              <div className={styles.panelHeading}><div><strong>Upcoming interviews</strong><span>Your team’s schedule</span></div><CalendarDays size={15} /></div>
              <div className={styles.interviewList}>
                {candidates.map((candidate) => (
                  <div className={styles.interviewRow} key={candidate.name}>
                    <span className={styles[candidate.tone as keyof typeof styles]}>{candidate.initials}</span>
                    <div><b>{candidate.name}</b><small>{candidate.role}</small></div>
                    <time>{candidate.time}</time>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className={styles.previewFootnote}><CircleHelp size={11} /> Sample dashboard for demonstration only — not live account data.</div>
        </div>
      </div>
    </div>
  );
}
