// seed-data.js — 用 mongosh 跑: mongosh mongodb://localhost:27017/email-agent /tmp/seed-data.js
// 往 leads, email_queue, verified_emails, users 插入模擬數據

const db = db.getSiblingDB('email-agent');

// ── Helper ──
function uid() { return Math.random().toString(16).slice(2, 10); }
function isoNow(offsetDays) {
  const d = new Date(); d.setDate(d.getDate() + (offsetDays || 0));
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── 公司數據池 ──
const COMPANIES = [
  { name: 'Acme Web Solutions', domain: 'acmeweb.com', industry: ['Web Design', 'SaaS'] },
  { name: 'Dragon Digital HK', domain: 'dragondigital.hk', industry: ['Digital Marketing'] },
  { name: 'Sunrise Tech Ltd', domain: 'sunrisetech.com', industry: ['IT Services', 'Cloud'] },
  { name: 'Pearl River Trading', domain: 'pearlrivertrading.com', industry: ['E-commerce', 'Import/Export'] },
  { name: 'MegaByte Studio', domain: 'megabyte.io', industry: ['Game Development'] },
  { name: 'Golden Gate Apps', domain: 'goldengate.app', industry: ['Mobile App', 'SaaS'] },
  { name: 'Bamboo Creative', domain: 'bamboocreative.co', industry: ['Branding', 'Design'] },
  { name: 'NovaStar AI', domain: 'novastar.ai', industry: ['AI/ML', 'Data Analytics'] },
  { name: 'Harbor View Media', domain: 'harborview.media', industry: ['Video Production', 'Marketing'] },
  { name: 'Summit Logistics', domain: 'summitlogistics.com', industry: ['Logistics', 'Supply Chain'] },
  { name: 'Crystal Clear SEO', domain: 'crystalclearseo.com', industry: ['SEO', 'Content Marketing'] },
  { name: 'BlueSky Ventures', domain: 'bluesky.vc', industry: ['Venture Capital', 'Finance'] },
  { name: 'Panda Software', domain: 'pandasoft.cn', industry: ['Software Development'] },
  { name: 'Horizon Education', domain: 'horizonedu.com', industry: ['EdTech', 'Online Learning'] },
  { name: 'Lightning Print HK', domain: 'lightningprint.hk', industry: ['Printing', 'Design'] },
  { name: 'Jade Mountain Consulting', domain: 'jademountain.co', industry: ['Consulting', 'Strategy'] },
  { name: 'Quantum Labs', domain: 'quantumlabs.dev', industry: ['R&D', 'Deep Tech'] },
  { name: 'Pixel Perfect Studio', domain: 'pixelperfect.design', industry: ['UI/UX', 'Web Design'] },
  { name: 'Evergreen Marketing', domain: 'evergreenm.com', industry: ['Digital Marketing', 'SEO'] },
  { name: 'Pacific Cloud Services', domain: 'pacificcloud.io', industry: ['Cloud Infrastructure', 'DevOps'] },
  { name: 'Tiger Electronics', domain: 'tigerelectronics.com', industry: ['Electronics', 'IoT'] },
  { name: 'Swift Delivery Co', domain: 'swiftdelivery.hk', industry: ['Logistics', 'Last-mile'] },
  { name: 'Maple Finance Group', domain: 'maplefinance.com', industry: ['FinTech', 'Insurance'] },
  { name: 'Coral Reef Studios', domain: 'coralreef.studio', industry: ['Animation', '3D Design'] },
  { name: 'Ironclad Security', domain: 'ironcladsecu.com', industry: ['Cybersecurity', 'IT'] },
  { name: 'Lotus Health Tech', domain: 'lotushealth.tech', industry: ['HealthTech', 'Wellness'] },
  { name: 'Oceanic Data Systems', domain: 'oceanicdata.com', industry: ['Big Data', 'Analytics'] },
  { name: 'Redwood Construction', domain: 'redwoodcon.com', industry: ['Construction', 'Real Estate'] },
  { name: 'Falcon Aerospace', domain: 'falconaero.com', industry: ['Aerospace', 'Engineering'] },
  { name: 'Cherry Blossom Cafe', domain: 'cherryblossom.cafe', industry: ['F&B', 'Hospitality'] },
];

const FIRST_NAMES = ['James', 'Alice', 'David', 'Emily', 'Kevin', 'Sarah', 'Michael', 'Lisa', 'Tom', 'Rachel', 'Chris', 'Amy', 'Jason', 'Nicole', 'Brian'];
const LAST_NAMES = ['Wong', 'Chan', 'Lee', 'Chen', 'Zhang', 'Liu', 'Wang', 'Lin', 'Ho', 'Ng', 'Lam', 'Tang', 'Cheng', 'Yip', 'Fung'];

const SUBJECTS_POOL = [
  'Partnership Opportunity — {{company}}',
  'Collaboration Proposal for {{company}}',
  'Introducing Our Services to {{company}}',
  'Quick Question for {{company}} Team',
  'Follow-up: Our Previous Conversation',
  'Can We Help {{company}} Grow?',
  'Exciting Opportunity for {{company}}',
];

const REPLY_CATEGORIES = ['interested', 'meeting', 'question', 'not_interested', 'auto_reply', null];
const VERIFICATION_METHODS = ['auto_reply_count', 'ai_check', 'manual'];

const USER_ID = 'U-' + uid();

// ═══ 1) Users ═══
print('--- Seeding users ---');
const bcryptHash = '$2a$10$XQCg1z4YR1S0GN0aGsBMsOXGFYEH0RaGFJdLgNhSVCeyv/jzyZ7EK'; // "123456"

const usersToInsert = [
  { email: 'admin@test.com', password: bcryptHash, name: 'Admin', role: 'admin', permissions: ['manage_users', 'manage_leads', 'manage_emails', 'manage_settings'], created_at: new Date(), updated_at: new Date(), deleted_at: null, notification_prefs: { email_on_complete: false, browser_on_complete: false }, resetToken: null, resetTokenExpiry: null, companyName: 'MAD Mobile Application Development Ltd', companyDescription: 'Intelligent client discovery platform', companyWebsite: 'https://clientradar.ai' },
  { email: 'intern1@test.com', password: bcryptHash, name: 'Intern 1', role: 'staff', permissions: ['manage_leads', 'manage_emails'], created_at: new Date(), updated_at: new Date(), deleted_at: null, notification_prefs: { email_on_complete: false, browser_on_complete: false }, resetToken: null, resetTokenExpiry: null, companyName: '', companyDescription: '', companyWebsite: '' },
  { email: 'intern2@test.com', password: bcryptHash, name: 'Intern 2', role: 'staff', permissions: ['manage_leads', 'manage_emails'], created_at: new Date(), updated_at: new Date(), deleted_at: null, notification_prefs: { email_on_complete: true, browser_on_complete: true }, resetToken: null, resetTokenExpiry: null, companyName: '', companyDescription: '', companyWebsite: '' },
  { email: 'intern3@test.com', password: bcryptHash, name: 'Intern 3', role: 'staff', permissions: ['manage_leads'], created_at: new Date(), updated_at: new Date(), deleted_at: null, notification_prefs: { email_on_complete: false, browser_on_complete: false }, resetToken: null, resetTokenExpiry: null, companyName: '', companyDescription: '', companyWebsite: '' },
  { email: 'manager@test.com', password: bcryptHash, name: 'Manager', role: 'admin', permissions: ['manage_users', 'manage_leads', 'manage_emails', 'manage_settings'], created_at: new Date(), updated_at: new Date(), deleted_at: null, notification_prefs: { email_on_complete: true, browser_on_complete: true }, resetToken: null, resetTokenExpiry: null, companyName: 'MAD Mobile Application Development Ltd', companyDescription: 'We build mobile apps', companyWebsite: 'https://madmobileai.com' },
];

// 清空再插入（避免重複）
db.users.deleteMany({ email: { $in: usersToInsert.map(u => u.email) } });
db.users.insertMany(usersToInsert);
print(`  Inserted ${usersToInsert.length} users`);

// ═══ 2) Leads ═══
print('--- Seeding leads ---');
const leads = [];
for (let i = 0; i < COMPANIES.length; i++) {
  const c = COMPANIES[i];
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  const contactEmail = `${fn.toLowerCase()}.${ln.toLowerCase()}@${c.domain}`;
  const daysAgo = Math.floor(Math.random() * 60);
  const importedAt = isoNow(-daysAgo);

  const statusRoll = Math.random();
  let status = null;
  let emailSent = false;
  let emailSentAt = null;
  let noReply = false;
  let followupCount = 0;
  let replyCat = null;

  if (statusRoll < 0.3) {
    // 未聯絡
    status = null;
  } else if (statusRoll < 0.7) {
    // contacted
    status = 'contacted';
    emailSent = true;
    emailSentAt = isoNow(-daysAgo + Math.floor(Math.random() * 5));
    if (Math.random() < 0.5) {
      noReply = true;
      followupCount = Math.floor(Math.random() * 3);
    } else {
      replyCat = pick(['interested', 'meeting', 'question', 'not_interested', 'auto_reply']);
    }
  } else {
    // contacted with reply
    status = 'contacted';
    emailSent = true;
    emailSentAt = isoNow(-daysAgo + 2);
    replyCat = pick(['interested', 'meeting', 'question']);
  }

  leads.push({
    lead_id: 'L-' + uid(),
    user_id: USER_ID,
    company_name: c.name,
    industry_tags: c.industry,
    source: pick(['Google Maps', 'LinkedIn', 'Website Scrape', 'Manual Entry']),
    google_maps_url: `https://maps.google.com/?q=${encodeURIComponent(c.name)}`,
    search_query: c.industry[0],
    email: contactEmail,
    extra_emails: Math.random() < 0.3 ? [`info@${c.domain}`] : undefined,
    phone: `+852 ${Math.floor(10000000 + Math.random() * 90000000)}`,
    website: `https://${c.domain}`,
    address: `${Math.floor(1 + Math.random() * 200)} ${pick(['Queen\'s Road', 'Nathan Road', 'Des Voeux Road', 'Hennessy Road', 'Canton Road'])}, Hong Kong`,
    rating: (3 + Math.random() * 2).toFixed(1),
    website_description: `${c.name} is a leading company in ${c.industry.join(' and ')}.`,
    _website_researched: Math.random() < 0.6,
    status: status,
    _email_sent: emailSent,
    _email_sent_at: emailSentAt,
    _no_reply: noReply,
    _followup_count: followupCount,
    _reply_category: replyCat,
    _status: pick(['verified', 'verified', 'verified', 'unverified']),
    _has_analysis: Math.random() < 0.5,
    _has_email_draft: emailSent,
    _has_wa_message: Math.random() < 0.2,
    email_draft: emailSent ? `Dear ${fn},\n\nI hope this email finds you well. I wanted to reach out regarding a potential collaboration between our companies...\n\nBest regards` : undefined,
    _collab_primary: Math.random() < 0.4 ? pick(['Web Development', 'Mobile App', 'AI Integration', 'Marketing Partnership']) : undefined,
    _collab_pitch: Math.random() < 0.4 ? `We can help ${c.name} leverage our platform to enhance client discovery and outreach automation.` : undefined,
    _imported_at: importedAt,
    _cleaned_at: isoNow(-daysAgo + 1),
    _deleted_at: null,
  });
}

db.leads.deleteMany({ user_id: USER_ID });
db.leads.insertMany(leads);
print(`  Inserted ${leads.length} leads`);

// ═══ 3) Email Queue ═══
print('--- Seeding email_queue ---');
const emailQueue = [];
const sentLeads = leads.filter(l => l._email_sent);
for (const lead of sentLeads) {
  const subjectTpl = pick(SUBJECTS_POOL);
  const subject = subjectTpl.replace('{{company}}', lead.company_name);
  const daysAgo = Math.floor(Math.random() * 30);
  const createdAt = isoNow(-daysAgo);

  const statusRoll = Math.random();
  let emailStatus = 'sent';
  let sentAt = isoNow(-daysAgo + 1);
  if (statusRoll < 0.15) { emailStatus = 'pending'; sentAt = null; }
  else if (statusRoll < 0.25) { emailStatus = 'approved'; sentAt = null; }
  else if (statusRoll < 0.30) { emailStatus = 'failed'; sentAt = null; }

  emailQueue.push({
    email_id: uid(),
    lead_id: lead.lead_id,
    user_id: USER_ID,
    company_name: lead.company_name,
    to_email: lead.email,
    subject: subject,
    body: `Dear Team,\n\n${lead._collab_pitch || 'I would like to discuss a potential partnership opportunity.'}\n\nLooking forward to hearing from you.\n\nBest regards,\nClientRadar AI Team`,
    status: emailStatus,
    created_at: createdAt,
    sent_at: sentAt,
    error: emailStatus === 'failed' ? { message: 'SMTP connection timeout', code: 'ETIMEDOUT' } : null,
  });

  // 30% chance of follow-up email
  if (Math.random() < 0.3 && emailStatus === 'sent') {
    emailQueue.push({
      email_id: uid(),
      lead_id: lead.lead_id,
      user_id: USER_ID,
      company_name: lead.company_name,
      to_email: lead.email,
      subject: `Re: ${subject}`,
      body: `Hi,\n\nJust following up on my previous email. Would love to connect!\n\nBest regards`,
      status: pick(['pending', 'sent', 'approved']),
      created_at: isoNow(-daysAgo + 5),
      sent_at: isoNow(-daysAgo + 6),
    });
  }
}

db.email_queue.deleteMany({ user_id: USER_ID });
db.email_queue.insertMany(emailQueue);
print(`  Inserted ${emailQueue.length} emails`);

// ═══ 4) Verified Emails ═══
print('--- Seeding verified_emails ---');
const verifiedEmails = [];
const repliedLeads = leads.filter(l => l._reply_category && ['interested', 'meeting', 'question'].includes(l._reply_category));
for (const lead of repliedLeads) {
  verifiedEmails.push({
    email: lead.email,
    company_name: lead.company_name,
    domain: lead.email.split('@')[1],
    source_user_id: USER_ID,
    source_lead_id: lead.lead_id,
    verification_method: pick(VERIFICATION_METHODS),
    reply_count: 1 + Math.floor(Math.random() * 5),
    match_count: Math.floor(Math.random() * 3),
    status: Math.random() < 0.9 ? 'active' : 'revoked',
    notes: '',
  });
}
// Add a few extra manual ones
const extraVerified = [
  { email: 'hello@techstartup.io', company_name: 'Tech Startup Inc', domain: 'techstartup.io' },
  { email: 'sales@globalretail.com', company_name: 'Global Retail Corp', domain: 'globalretail.com' },
  { email: 'contact@smartfactory.hk', company_name: 'Smart Factory HK', domain: 'smartfactory.hk' },
];
for (const ev of extraVerified) {
  verifiedEmails.push({
    ...ev,
    source_user_id: USER_ID,
    source_lead_id: 'L-manual',
    verification_method: 'manual',
    reply_count: 0,
    match_count: 0,
    status: 'active',
    notes: 'Manually added',
  });
}

db.verified_emails.deleteMany({ source_user_id: USER_ID });
db.verified_emails.insertMany(verifiedEmails);
print(`  Inserted ${verifiedEmails.length} verified emails`);

print('\n✅ Seed complete!');
print(`  Users:    ${db.users.countDocuments()}`);
print(`  Leads:    ${db.leads.countDocuments()}`);
print(`  Emails:   ${db.email_queue.countDocuments()}`);
print(`  Verified: ${db.verified_emails.countDocuments()}`);
