import Link from 'next/link';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness,
  Building2, CalendarCheck2, Check, CheckCircle2, ChevronDown, CircleCheck,
  ClipboardList, FileText, Fingerprint, GitBranch, Globe2, Handshake,
  Layers3, MessageSquareText, SearchCheck, ShieldCheck, Sparkles, Users,
  Workflow, Zap,
} from 'lucide-react';
import { Navbar } from './navbar';
import { DashboardPreview } from './dashboard-preview';
import styles from '@/app/marketing.module.css';

const features = [
  { icon: BriefcaseBusiness, title: 'Job posting management', text: 'Create, organize and publish openings with a clear view of every role.' },
  { icon: Users, title: 'Candidate management', text: 'Keep candidate profiles, resumes, notes and conversations in one place.' },
  { icon: GitBranch, title: 'Recruitment pipeline', text: 'Move candidates through customizable stages with a shared view of progress.' },
  { icon: CalendarCheck2, title: 'Interview scheduling', text: 'Coordinate interview plans, feedback and next steps without losing context.' },
  { icon: Handshake, title: 'Team collaboration', text: 'Give hiring teams the context they need to make thoughtful decisions together.' },
  { icon: BarChart3, title: 'Recruitment analytics', text: 'Understand activity across jobs and hiring stages with clear reporting.' },
  { icon: MessageSquareText, title: 'Candidate communication', text: 'Keep recruitment conversations and updates connected to each candidate.' },
  { icon: ClipboardList, title: 'Application tracking', text: 'Follow every application from first review to final decision.' },
];

const steps = [
  { number: '01', icon: FileText, title: 'Create and publish', text: 'Set up job openings and share opportunities with the right audience.' },
  { number: '02', icon: SearchCheck, title: 'Discover and organize', text: 'Bring candidate profiles and applications into one structured workspace.' },
  { number: '03', icon: CheckCircle2, title: 'Collaborate and hire', text: 'Coordinate interviews, collect feedback and move decisions forward.' },
];

const benefits = [
  { icon: Layers3, title: 'One organized workspace', text: 'Bring jobs, candidate details and hiring activity together instead of spreading context across tools.' },
  { icon: Zap, title: 'Less process friction', text: 'Make routine recruitment steps easier to follow, repeat and hand over.' },
  { icon: Users, title: 'A more connected team', text: 'Give recruiters and hiring managers a shared understanding of each candidate’s progress.' },
  { icon: Activity, title: 'Clearer hiring visibility', text: 'See how work moves through your pipeline and where teams may need to focus.' },
  { icon: ShieldCheck, title: 'Structured candidate records', text: 'Keep important application information and decisions connected over time.' },
];

const faqs = [
  { q: 'What is OpenATS?', a: 'OpenATS is an applicant tracking and recruitment platform for organizing job postings, candidate records, applications, hiring stages and interview workflows in one workspace.' },
  { q: 'Who can use OpenATS?', a: 'OpenATS is designed for employers, internal talent teams, recruitment agencies and candidates engaging with published opportunities.' },
  { q: 'Can agencies manage multiple clients?', a: 'OpenATS supports agency-oriented recruitment workflows, including organizing roles and candidates across client relationships. Available capabilities depend on your workspace configuration.' },
  { q: 'Can candidates apply for jobs?', a: 'Organizations can publish career opportunities and receive applications. Candidate account access and self-service application management are outside this landing-page phase.' },
  { q: 'Is OpenATS suitable for small companies?', a: 'Yes. A structured recruitment workspace can help small teams keep job details, candidate conversations and hiring decisions organized as they grow.' },
  { q: 'How can an organization get started?', a: 'Use Get started to create an organization workspace, or log in if your team already has an OpenATS account.' },
];

function SectionIntro({ eyebrow, title, text, centered = false }: { eyebrow: string; title: string; text: string; centered?: boolean }) {
  return (
    <div className={centered ? styles.sectionIntroCenter : styles.sectionIntro}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function TrustSection() {
  return (
    <section className={styles.trustSection} aria-label="Built for modern hiring teams">
      <p>One workspace. Every hiring relationship.</p>
      <div className={styles.trustMarks}>
        <span><Building2 size={17} /> EMPLOYERS</span>
        <span><Globe2 size={17} /> AGENCIES</span>
        <span><Users size={17} /> TALENT TEAMS</span>
        <span><Fingerprint size={17} /> CANDIDATES</span>
      </div>
      <small>Audience categories shown for illustration — not customer or partner logos.</small>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.container}>
        <SectionIntro eyebrow="The platform" title="Everything your hiring workflow needs." text="From the first job brief to the final decision, keep recruitment work connected and easy to follow." centered />
        <div className={styles.featureGrid}>
          {features.map(({ icon: Icon, title, text }, index) => (
            <article className={styles.featureCard} key={title}>
              <span className={styles.featureIcon}><Icon size={19} strokeWidth={1.8} /></span>
              <span className={styles.featureIndex}>0{index + 1}</span>
              <h3>{title}</h3><p>{text}</p>
              <ArrowUpRight className={styles.cardArrow} size={16} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className={styles.howSection} id="how-it-works">
      <div className={styles.container}>
        <SectionIntro eyebrow="A clearer process" title="From open role to the right hire." text="A straightforward flow helps your team know what happens next — and who needs to be involved." centered />
        <div className={styles.stepsGrid}>
          {steps.map(({ number, icon: Icon, title, text }, index) => (
            <article className={styles.stepCard} key={number}>
              <div className={styles.stepTop}><span>{number}</span><Icon size={22} /></div>
              <h3>{title}</h3><p>{text}</p>
              {index < 2 && <div className={styles.stepConnector}><ArrowRight size={17} /></div>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionsSection() {
  const solutions = [
    { icon: Building2, label: 'For employers', title: 'Build your team with clarity.', text: 'Bring internal hiring into one shared workspace.', items: ['Manage internal recruitment', 'Organize hiring teams', 'Track applicants by role'], action: 'Create an employer workspace', href: '/signup', tone: 'solutionBlue' },
    { icon: BriefcaseBusiness, label: 'For agencies', title: 'Every client. One clear view.', text: 'Keep multi-client recruitment organized as your desk grows.', items: ['Manage multiple clients', 'Organize client job openings', 'Track candidates across workflows'], action: 'Explore agency workflows', href: '/signup', tone: 'solutionViolet' },
    { icon: Users, label: 'For candidates', title: 'A more thoughtful job journey.', text: 'Discover opportunities and stay connected to your applications.', items: ['Discover published opportunities', 'Apply for relevant roles', 'Follow application progress'], action: 'Candidate experience coming soon', href: '#candidate-experience', tone: 'solutionSlate', disabled: true },
  ];
  return (
    <section className={styles.section} id="solutions">
      <div className={styles.container}>
        <SectionIntro eyebrow="Made for every side of hiring" title="One platform. Different perspectives." text="Whether you build teams, recruit for clients or explore your next role, OpenATS is designed around the people in the process." centered />
        <div className={styles.solutionGrid} id="candidate-experience">
          {solutions.map(({ icon: Icon, label, title, text, items, action, href, tone, disabled }) => (
            <article className={styles.solutionCard} key={label}>
              <span className={styles.solutionIcon}><Icon size={21} /></span>
              <span className={styles.solutionLabel}>{label}</span>
              <h3>{title}</h3><p>{text}</p>
              <ul>{items.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
              {disabled ? <span className={styles.comingSoon}>{action}</span> : <Link className={styles.textLink} href={href}>{action}<ArrowUpRight size={15} /></Link>}
              <span className={styles[tone as keyof typeof styles]} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSection() {
  return (
    <section className={styles.productSection}>
      <div className={styles.container}>
        <div className={styles.productHeader}>
          <SectionIntro eyebrow="A workspace that makes sense" title="See the whole hiring picture." text="A considered overview brings your open roles, candidate activity and upcoming conversations into focus." />
          <span className={styles.productTag}><Sparkles size={14} /> Product preview</span>
        </div>
        <DashboardPreview />
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.benefitLayout}>
          <SectionIntro eyebrow="Why OpenATS" title="Good hiring starts with a better process." text="Give your team the structure to spend less time coordinating and more time connecting with people." />
          <div className={styles.benefitList}>
            {benefits.map(({ icon: Icon, title, text }) => (
              <article className={styles.benefitItem} key={title}>
                <span><Icon size={19} /></span><div><h3>{title}</h3><p>{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    { name: 'Starter', description: 'A simple place to bring your hiring together.', price: 'Coming soon', items: ['Core job and candidate workflows', 'Organized hiring pipeline', 'Essential team collaboration'], featured: false },
    { name: 'Professional', description: 'More structure for growing recruitment teams.', price: 'Contact sales', items: ['Everything in Starter', 'Advanced recruitment workflows', 'Expanded reporting and visibility', 'Team collaboration tools'], featured: true },
    { name: 'Enterprise', description: 'A tailored approach for complex organizations.', price: 'Let’s talk', items: ['Everything in Professional', 'Organization-level configuration', 'Deployment and support discussion'], featured: false },
  ];
  return (
    <section className={styles.pricingSection} id="pricing">
      <div className={styles.container}>
        <SectionIntro eyebrow="Straightforward plans" title="The right fit for your hiring." text="We’re shaping plans around the needs of different recruitment teams. Pricing details will be announced soon." centered />
        <div className={styles.pricingGrid}>
          {plans.map((plan) => (
            <article className={plan.featured ? styles.priceCardFeatured : styles.priceCard} key={plan.name}>
              {plan.featured && <span className={styles.recommended}>For growing teams</span>}
              <h3>{plan.name}</h3><p>{plan.description}</p>
              <div className={styles.priceValue}>{plan.price}</div>
              <span className={styles.included}>What’s included</span>
              <ul>{plan.items.map((item) => <li key={item}><CircleCheck size={15} />{item}</li>)}</ul>
              <Link href="/signup" className={plan.featured ? styles.priceCtaPrimary : styles.priceCta}>{plan.name === 'Enterprise' ? 'Start a conversation' : 'Get started'}<ArrowUpRight size={15} /></Link>
            </article>
          ))}
        </div>
        <p className={styles.pricingNote}>Plan names and inclusions are indicative. Final pricing and feature availability have not yet been announced.</p>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className={styles.section} id="resources">
      <div className={styles.container}>
        <div className={styles.faqLayout}>
          <SectionIntro eyebrow="Questions, answered" title="A few things you might be wondering." text="Learn how OpenATS brings employers, agencies and candidates into a more connected hiring process." />
          <div className={styles.faqList}>
            {faqs.map(({ q, a }, index) => (
              <details className={styles.faqItem} key={q} open={index === 0}>
                <summary>{q}<ChevronDown size={17} /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className={styles.finalSection}>
      <div className={styles.finalOrbOne} /><div className={styles.finalOrbTwo} />
      <div className={styles.finalContent}>
        <span className={styles.finalEyebrow}>A better way to work together</span>
        <h2>Build a better<br />hiring experience.</h2>
        <p>Bring your jobs, candidates and people together with OpenATS.</p>
        <Link href="/signup" className={styles.finalButton}>Get started with OpenATS <ArrowUpRight size={17} /></Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.wordmark}><span className={styles.brandIcon}><BriefcaseBusiness size={18} /></span><span>open<span className={styles.brandAccent}>ats</span></span></Link>
            <p>Recruitment, simplified.<br />Talent, discovered.</p>
          </div>
          <div className={styles.footerColumn}><strong>Product</strong><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a></div>
          <div className={styles.footerColumn}><strong>Solutions</strong><a href="#solutions">For employers</a><a href="#solutions">For agencies</a><a href="#candidate-experience">For candidates</a></div>
          <div className={styles.footerColumn}><strong>Resources</strong><a href="#resources">FAQs</a><a href="#product-preview">Product preview</a><a href="#resources">Getting started</a></div>
          <div className={styles.footerColumn}><strong>Account</strong><Link href="/login">Log in</Link><Link href="/signup">Get started</Link><span>Contact details coming soon</span></div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} OpenATS. Built for better hiring.</span>
          <span className={styles.legalPlaceholder}>Privacy policy · Terms of service <small>Legal pages coming soon</small></span>
        </div>
      </div>
    </footer>
  );
}

export function MarketingPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.heroBadge}><span /> A clearer way to recruit</span>
            <h1>Recruitment,<br /><span>simplified.</span><br />Talent, discovered.</h1>
            <p>One powerful platform to manage jobs, candidates and hiring workflows. Help your team recruit smarter, collaborate better and hire faster.</p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.primaryButton}>Get started <ArrowUpRight size={17} /></Link>
              <a href="#features" className={styles.secondaryButton}>Explore features <ArrowRight size={16} /></a>
            </div>
            <div className={styles.heroNote}><CheckCircle2 size={14} /> A connected workspace for every hiring team</div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.visualBackdrop} />
            <div className={styles.visualBadge}><span className={styles.visualBadgeIcon}><Workflow size={16} /></span><span><b>Hiring, in sync</b><small>Jobs · People · Progress</small></span></div>
            <div className={styles.heroMiniCard}><span className={styles.miniCardIcon}><Bell size={15} /></span><span><b>Next step, made clear</b><small>Keep every conversation moving.</small></span><span className={styles.miniCheck}><Check size={13} /></span></div>
            <DashboardPreview />
          </div>
        </div>
        <div className={styles.heroBottom}><span>01 / Recruitment workspace</span><span>Built around people, not paperwork <ArrowRight size={13} /></span></div>
      </section>
      <div className={styles.container}><TrustSection /></div>
      <FeaturesSection />
      <HowItWorksSection />
      <SolutionsSection />
      <div id="product-preview"><ProductSection /></div>
      <BenefitsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
