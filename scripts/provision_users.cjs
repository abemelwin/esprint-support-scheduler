const { createClient } = require('@supabase/supabase-js');

const url = 'https://tlxbcvakkhhswqdyooqt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRseGJjdmFra2hoc3dxZHlvb3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NjQ4NTEsImV4cCI6MjEwNDE0MDg1MX0.nDYcw9ItG5ZtjyZuN8zsoVuFl9fD_naGYmjGuEmYdI8';

const ALL_BRANCHES = ['b1','b2','b3','b4','b5','b6','b7','b8','b9','b10','b11','b12','b13','b14','b15','b16','b17','b18','b19','b20'];
const LUZON_BRANCHES = ['b4','b5','b6','b12','b13','b15','b16','b17'];
const MIN_NORTH_BRANCHES = ['b2','b3','b7','b14','b20'];
const MIN_SOUTH_BRANCHES = ['b9','b10','b19'];

const DEFAULT_PASSWORD = 'Esprint2026!';

const usersToProvision = [
  // Super Admins
  { email: 'arnold@esprintmedia.com', name: 'Arnold Rioja', role: 'admin', branch_ids: [], can_edit: true },
  { email: 'dan@esprintmedia.com', name: 'Danilo Carangan', role: 'admin', branch_ids: [], can_edit: true },
  { email: 'eileensokua@esprintmedia.com', name: 'Eileen So Kua', role: 'admin', branch_ids: [], can_edit: true },

  // All Branch Viewers but strictly Luzon scheduler
  { email: 'esprint.rickyeina@gmail.com', name: 'Ricky Eina', role: 'service_manager', branch_ids: LUZON_BRANCHES, can_edit: true },
  { email: 'espmi.limwel@gmail.com', name: 'Limwel De Chavez', role: 'service_manager', branch_ids: ['b4','b12','b16'], can_edit: true },

  // Viewers only - All Branches
  { email: 'espmi.mavenus@gmail.com', name: 'Venus Liloan', role: 'branch', branch_ids: ALL_BRANCHES, can_edit: false },
  { email: 'espmi.angelie@gmail.com', name: 'Angelie Tamondong', role: 'branch', branch_ids: ALL_BRANCHES, can_edit: false },
  { email: 'espmi.ariane@gmail.com', name: 'Arianne Espinosa', role: 'branch', branch_ids: ALL_BRANCHES, can_edit: false },
  { email: 'esprint.philipgarcia@gmail.com', name: 'June Philip Garcia', role: 'branch', branch_ids: ALL_BRANCHES, can_edit: false },
  { email: 'esprint_johntrentsioco@yahoo.com', name: 'John Trent Sioco', role: 'branch', branch_ids: ALL_BRANCHES, can_edit: false },
  { email: 'esprint.natan@gmail.com', name: 'Dennis Natan', role: 'branch', branch_ids: ALL_BRANCHES, can_edit: false },
  { email: 'esprint_donalexander@yahoo.com', name: 'Don Alexander Yumang', role: 'branch', branch_ids: ALL_BRANCHES, can_edit: false },

  // Luzon
  { email: 'escgi.michael@gmail.com', name: 'Michael Almoite', role: 'branch', branch_ids: ['b15'], can_edit: true },

  // Visayas
  { email: 'esprint_principe@yahoo.com', name: 'Michael Principe', role: 'service_manager', branch_ids: ['b1','b11'], can_edit: true },
  { email: 'esprint.jessrielcalvo@gmail.com', name: 'Jessriel Calvo', role: 'branch', branch_ids: ['b8'], can_edit: true },
  { email: 'esprint.darelcoliflores@gmail.com', name: 'John Darel Coliflores', role: 'branch', branch_ids: ['b18'], can_edit: true },

  // Mindanao North
  { email: 'espii.geralds@gmail.com', name: 'Gerald Sacuan', role: 'service_manager', branch_ids: MIN_NORTH_BRANCHES, can_edit: true },
  { email: 'espii.Kevinn@gmail.com', name: 'Kevin Mendez', role: 'branch', branch_ids: ['b14'], can_edit: true },
  { email: 'esprint.nicholson@gmail.com', name: 'Nicholson Sia', role: 'branch', branch_ids: ['b20'], can_edit: true },
  { email: 'espii.michaelt@gmail.com', name: 'Michael Tagupa', role: 'branch', branch_ids: ['b3'], can_edit: true },
  { email: 'espii.paul@gmail.com', name: 'Paul Anthony Dabatian', role: 'branch', branch_ids: ['b2'], can_edit: true },

  // Mindanao South
  { email: 'espii.junjun@gmail.com', name: 'Martin Genabe', role: 'service_manager', branch_ids: MIN_SOUTH_BRANCHES, can_edit: true },
  { email: 'espii.haber@gmail.com', name: 'Habel Basal', role: 'branch', branch_ids: ['b10'], can_edit: true },
];

async function run() {
  const sbSignup = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log(`Starting provisioning for ${usersToProvision.length} users...`);

  for (const u of usersToProvision) {
    const email = u.email.trim().toLowerCase();
    process.stdout.write(`Provisioning: ${email} (${u.name}) ... `);

    // 1. Sign up user
    const { data: authData, error: authErr } = await sbSignup.auth.signUp({
      email: email,
      password: DEFAULT_PASSWORD,
      options: { data: { name: u.name } }
    });

    let authId = authData?.user?.id;

    // 2. Sign in to obtain session to write to app_users table
    const sbUser = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signinData, error: signinErr } = await sbUser.auth.signInWithPassword({
      email: email,
      password: DEFAULT_PASSWORD
    });

    if (signinData?.user?.id) {
      authId = signinData.user.id;
      
      // Upsert into app_users
      const { data: existingAppUsers } = await sbUser.from('app_users').select('*').eq('auth_id', authId);
      if (!existingAppUsers || existingAppUsers.length === 0) {
        const { error: insErr } = await sbUser.from('app_users').insert({
          auth_id: authId,
          name: u.name,
          email: email,
          role: u.role,
          branch_ids: u.branch_ids,
          can_edit: u.can_edit,
          is_active: true,
          is_approved: true
        });
        if (insErr) {
          console.log(`❌ Insert error: ${insErr.message}`);
        } else {
          console.log(`✅ Created (Role: ${u.role}, CanEdit: ${u.can_edit})`);
        }
      } else {
        const { error: updErr } = await sbUser.from('app_users').update({
          name: u.name,
          role: u.role,
          branch_ids: u.branch_ids,
          can_edit: u.can_edit,
          is_active: true,
          is_approved: true
        }).eq('auth_id', authId);
        if (updErr) {
          console.log(`❌ Update error: ${updErr.message}`);
        } else {
          console.log(`✅ Updated (Role: ${u.role}, CanEdit: ${u.can_edit})`);
        }
      }
    } else {
      console.log(`⚠️ Note: ${signinErr?.message || 'Could not sign in directly (custom existing password)'}`);
    }
  }

  console.log('\nAll user provisioning steps finished!');
}

run();
