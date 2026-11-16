import type { Metadata } from 'next';
import { MarketingPage } from '@/components/marketing/marketing-page';

export const metadata: Metadata = {
  title: 'OpenATS — Recruitment, simplified. Talent, discovered.',
  description:
    'Manage jobs, candidates and hiring workflows in one thoughtful recruitment platform. Built for employers, recruitment agencies and candidates.',
  openGraph: {
    title: 'OpenATS — Recruitment, simplified. Talent, discovered.',
    description:
      'One platform for job postings, candidate management and collaborative hiring workflows.',
    type: 'website',
  },
};

export default function Page() {
  return <MarketingPage />;
}
