-- ============================================================
-- ES Print Support Scheduler — Supabase Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. branches
create table if not exists public.branches (
  id   text primary key default gen_random_uuid()::text,
  name text not null,
  note text default ''
);

-- 2. staff
create table if not exists public.staff (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  role           text not null check (role in ('manager','bsm','senior','junior','trainee')),
  home_branch_id text references public.branches(id) on delete set null,
  hotline        boolean default false
);

-- 3. jobs
create table if not exists public.jobs (
  id          text primary key default gen_random_uuid()::text,
  date        text not null,  -- 'YYYY-MM-DD'
  jt_no       text not null,
  staff_id    text references public.staff(id) on delete set null,
  branch_id   text references public.branches(id) on delete set null,
  customer    text not null default '',
  location    text default '',
  type        text not null check (type in ('installation','onsite','hotline','others')),
  type_other  text default '',
  status      text not null default 'pending' check (status in ('pending','ongoing','success','fail')),
  status_note text default '',
  created_at  timestamptz default now()
);

-- 4. app_users (linked to Supabase Auth)
create table if not exists public.app_users (
  id         text primary key default gen_random_uuid()::text,
  auth_id    uuid references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null,
  role       text not null default 'branch' check (role in ('admin','branch')),
  branch_ids text[] default '{}'
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.branches  enable row level security;
alter table public.staff     enable row level security;
alter table public.jobs      enable row level security;
alter table public.app_users enable row level security;

-- Helper function: get current user's app role
create or replace function public.my_app_role()
returns text language sql security definer stable as $$
  select role from public.app_users where auth_id = auth.uid() limit 1;
$$;

-- Helper function: get current user's branch_ids
create or replace function public.my_branch_ids()
returns text[] language sql security definer stable as $$
  select branch_ids from public.app_users where auth_id = auth.uid() limit 1;
$$;

-- branches: all authenticated users can read; only admins can write
create policy "branches_select" on public.branches for select to authenticated using (true);
create policy "branches_insert" on public.branches for insert to authenticated with check (public.my_app_role() = 'admin');
create policy "branches_update" on public.branches for update to authenticated using (public.my_app_role() = 'admin');
create policy "branches_delete" on public.branches for delete to authenticated using (public.my_app_role() = 'admin');

-- staff: all authenticated users can read; only admins can write
create policy "staff_select" on public.staff for select to authenticated using (true);
create policy "staff_insert" on public.staff for insert to authenticated with check (public.my_app_role() = 'admin');
create policy "staff_update" on public.staff for update to authenticated using (public.my_app_role() = 'admin');
create policy "staff_delete" on public.staff for delete to authenticated using (public.my_app_role() = 'admin');

-- jobs: admins see all; branch users see only their branch
create policy "jobs_select_admin"  on public.jobs for select to authenticated
  using (public.my_app_role() = 'admin');
create policy "jobs_select_branch" on public.jobs for select to authenticated
  using (public.my_app_role() = 'branch' and branch_id = any(public.my_branch_ids()));
create policy "jobs_insert" on public.jobs for insert to authenticated
  with check (
    public.my_app_role() = 'admin'
    or (public.my_app_role() = 'branch' and branch_id = any(public.my_branch_ids()))
  );
create policy "jobs_update" on public.jobs for update to authenticated
  using (
    public.my_app_role() = 'admin'
    or (public.my_app_role() = 'branch' and branch_id = any(public.my_branch_ids()))
  );
create policy "jobs_delete" on public.jobs for delete to authenticated
  using (
    public.my_app_role() = 'admin'
    or (public.my_app_role() = 'branch' and branch_id = any(public.my_branch_ids()))
  );

-- app_users: only admins can read/write all; users can read their own
create policy "appusers_select_admin" on public.app_users for select to authenticated
  using (public.my_app_role() = 'admin');
create policy "appusers_select_self"  on public.app_users for select to authenticated
  using (auth_id = auth.uid());
create policy "appusers_insert" on public.app_users for insert to authenticated
  with check (public.my_app_role() = 'admin' or auth_id = auth.uid());
create policy "appusers_delete" on public.app_users for delete to authenticated
  using (public.my_app_role() = 'admin');

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.jobs;
alter publication supabase_realtime add table public.staff;
alter publication supabase_realtime add table public.branches;

-- ============================================================
-- Seed: Branches
-- ============================================================
insert into public.branches (id, name, note) values
  ('b1',  'BAC',    'Bacolod'),
  ('b2',  'BUK',    'Bukidnon'),
  ('b3',  'BUT',    'Butuan'),
  ('b4',  'CAB',    'Cabanatuan'),
  ('b5',  'CAMSUR', 'Camarines Sur'),
  ('b6',  'CAV',    'Cavite'),
  ('b7',  'CDO',    'Cagayan De Oro'),
  ('b8',  'CEB',    'Cebu'),
  ('b9',  'DAV',    'Davao'),
  ('b10', 'GENSAN', 'General Santos'),
  ('b11', 'ILO',    'Iloilo'),
  ('b12', 'ISA',    'Isabela'),
  ('b13', 'MAK',    'Makati'),
  ('b14', 'PAG',    'Pagadian'),
  ('b15', 'PAL',    'Palawan'),
  ('b16', 'PANG',   'Pangasinan'),
  ('b17', 'RIZ',    'Rizal'),
  ('b18', 'TAC',    'Tacloban'),
  ('b19', 'TAG',    'Tagum'),
  ('b20', 'ZAM',    'Zamboanga')
on conflict (id) do nothing;

-- ============================================================
-- Seed: Staff (all 151 from HTML)
-- ============================================================
insert into public.staff (id, name, role, home_branch_id, hotline) values
('s1','Aguilar, Kennemark Magbanua','senior','b1',false),
('s2','Arevalo, Franz Neilsen Panisa','senior','b1',false),
('s3','Carangan, Jose Aldrin Cabisag','senior','b1',false),
('s4','Hormigoso, Gene Roussle Laya-on','junior','b1',false),
('s5','Lamata, Aeron Hallara','trainee','b1',false),
('s6','Pasagdan, Paul Andrian','senior','b1',false),
('s7','Principe, Michael John Oliver Lagtapon','senior','b1',false),
('s8','Sericon, Joevic Ondrade','senior','b1',false),
('s9','Uy, Joseph Taladro','senior','b1',false),
('s10','Sabularse, Mark Dave Loren Fernandez','trainee','b2',false),
('s11','Gantia, Rey Arco','senior','b3',false),
('s12','Melecio, Bernard Lupos','trainee','b3',false),
('s13','Garcia, Albert Pineda','senior','b4',false),
('s14','Velasquez, Dean Lester Guarin','senior','b4',false),
('s15','Agum, Jhopet Jay Apas','junior','b7',false),
('s16','Caserayan, Delmar Besa','senior','b7',false),
('s17','Dabatian, Paul Anthony Bacleon','senior','b7',false),
('s18','Dael, Denniel Labadan','junior','b7',false),
('s19','Ello, Barry Angelo Laranjo','senior','b7',false),
('s20','Medillo, Jeric Hernando','senior','b7',false),
('s21','Rabanes, Jaimie Atienza','senior','b7',false),
('s22','Rupio, Chege Hopel Pacuribot','senior','b7',false),
('s23','Sacuan, Gerald Igaran','bsm','b7',false),
('s24','Salise, Metj Allen Maagad','senior','b7',false),
('s25','Sayson, Angelo Abria','junior','b7',false),
('s26','Suazo, Jemon Pavillan','senior','b7',false),
('s27','Tagupa, Michael Jhonry Sabella','senior','b7',false),
('s28','Ugsod, Carl Edison Daba','junior','b7',false),
('s29','Bangngayan, Jerry Parma','senior','b5',false),
('s30','Bron, Gerald Portuguez','senior','b5',false),
('s31','Flores, Armando Palomania','senior','b5',false),
('s32','Moral, Francis Orolfo','junior','b5',false),
('s33','Sibulo, Allan De Los Santos','trainee','b5',false),
('s34','Trillanes, Khristian Vincent Bolalin','senior','b5',false),
('s35','Caling, Franklin Co-Ot','senior','b8',false),
('s36','Calvo, Jerus Pasaje','senior','b8',false),
('s37','Calvo, Jessriel Pasaje','bsm','b8',false),
('s38','Javierto, Ariel Capistrano','junior','b8',false),
('s39','Mabanag, Jelson Fernandez','junior','b8',false),
('s40','Magallon, Melvin Mandawe','junior','b8',false),
('s41','Mahusay, Michael Mandawe','senior','b8',false),
('s42','Oaper, Michael James Baring','senior','b8',false),
('s43','Ouano, Jason Bonifacio','junior','b8',false),
('s44','Perida, Clariolito Alfanta','senior','b8',false),
('s45','Pulgo, Michael Cantila','senior','b8',false),
('s46','Versoza, Danilo Jr. Montellano','junior','b8',false),
('s47','Decolongon, Joshua Cabilto','senior','b9',false),
('s48','Genabe, Martin Jamin','bsm','b9',false),
('s49','Masanting, Mohaimin Balindong','junior','b9',false),
('s50','Mediano, John Lloyd Item','senior','b9',false),
('s51','Pakong, Almuhaimen Baluntitik','senior','b9',false),
('s52','Pallaya, Earl Jhonel Frondoza','senior','b9',false),
('s53','Taypin, Christian Dave Gemino','senior','b9',false),
('s54','Cajes, Dyve Calope','junior','b9',false),
('s55','Alviso, Alizandro Musa','trainee','b10',false),
('s56','Ariego, Mariel Butron','senior','b10',false),
('s57','Basal, Haber Morsal','senior','b10',false),
('s58','Buya, Jovanie Timbol','trainee','b10',false),
('s59','Dequinto, Jairus Deq Baligasa','junior','b10',false),
('s60','Gastardo, Kevin Christian Bulaqueña','junior','b10',false),
('s61','Jovenal, Jude Cariazo','trainee','b10',false),
('s62','Mike, Jehanoor Shiekalabi','senior','b10',false),
('s63','Panganiban, Jericho Maitim','junior','b10',false),
('s64','Perlas, Elpidio Jamir Daturajah','junior','b10',false),
('s65','Abalde, George Constantine Peñaverde','junior','b11',false),
('s66','Catalan, Rino Mark Cartin','senior','b11',false),
('s67','Dedace, Ryan Angelo Formarejo','junior','b11',false),
('s68','Gulla, Joemar Dolatre','junior','b11',false),
('s69','Cabanting, Charlie Dela Cruz','trainee','b12',false),
('s70','Corpuz, Denmark Ramos','senior','b12',false),
('s71','Dreza, Santiago Tagorda','senior','b12',false),
('s72','Letua, Frankleen Rufino','senior','b12',false),
('s73','Agum, Japeth Jay Abuzo','trainee','b13',false),
('s74','Almeida, Sydon Paulo Bacero','senior','b13',false),
('s75','Andaluz, Sherwin Distara','senior','b13',false),
('s76','Atipon, Mark Ranssel Pagaura','senior','b13',false),
('s77','Balberde, Rio Roco','junior','b13',false),
('s78','Banda Jr. Gerardo Pascual','junior','b13',false),
('s79','Banogbanog, Cherry Suson','junior','b13',false),
('s80','Borreros, Jhon Mark Agoja','senior','b13',false),
('s81','Cabiling, Bryan Jeric Dizon','junior','b13',false),
('s82','Cacho, Kenneth Presbitero','junior','b13',false),
('s83','Cacho, Rigel Ojales','senior','b13',false),
('s84','Caraan, Mark Ricjohn Magbalita','trainee','b13',false),
('s85','Carangan, Danilo Arellano','manager','b13',false),
('s86','Cerujano, Mernhad Vic Deinla','junior','b13',false),
('s87','Cervantes, Jomelyn Azuela','junior','b13',false),
('s88','Cosino, Park Johncel De Ungria','junior','b13',false),
('s89','De Chavez, Limwel Claveria','senior','b13',false),
('s90','De Ocampo, Airon Emnil','junior','b13',false),
('s91','Diagbel, Jefrey Pahal','senior','b13',false),
('s92','Diaz, Ralph Dominic De Villa','senior','b13',false),
('s93','Eina, Ricky Benito','manager','b13',false),
('s94','Encinas, Christian Pastrana','junior','b13',false),
('s95','Evangeles, Troy Joshua Flores','junior','b13',false),
('s96','Ibrahim, Al Khabir Taradji','junior','b13',false),
('s97','Lotino, Jerick Brioso','senior','b13',false),
('s98','Mabaquiao, Roy Bontigao','senior','b13',false),
('s99','Macabiog, Jay Mirones','senior','b13',false),
('s100','Maglalang, Jella Garcia','junior','b13',false),
('s101','Montillana, Jerick Evangelista','senior','b13',false),
('s102','Munsayac, Adrian Andrei Buan','junior','b13',false),
('s103','Natan, Dennis Onlagada','senior','b13',false),
('s104','Natcher, Jeremy Valencia','junior','b13',false),
('s105','Phua, Ramilito Dave Gatchalian','senior','b13',false),
('s106','Recentes, Cristian Mike Mejia','senior','b13',false),
('s107','Rejas, Jezreel Frankie','junior','b13',false),
('s108','Reyes, Cyron James Odto','trainee','b13',false),
('s109','Rioja, Arnold Lagura','manager','b13',false),
('s110','Rioja, Mark Kevin Lagura','senior','b13',false),
('s111','Roma, Juan Carlos Ahongon','senior','b13',false),
('s112','Salamanes, Emmanuel Ponsica','senior','b13',false),
('s113','Sioco, John Trent Mendoza','senior','b13',false),
('s114','Suñas, Maria Christina Navarro','junior','b13',false),
('s115','Talabucon, Ronie','junior','b13',false),
('s116','Tan, Christephen Paronne Jr.','trainee','b13',false),
('s117','Tariga, Mark Joseph De Jesus','senior','b13',false),
('s118','Templa, Marvin Jay Cortan','senior','b13',false),
('s119','Velarde, Peter Andrei Jamin','senior','b13',false),
('s120','Vergel De Dios, Jonh Rowel Pelin','junior','b13',false),
('s121','Vicente, Jan Philix Buhay','junior','b13',false),
('s122','Villanueva, Manuel Granados','junior','b13',false),
('s123','Yumang, Don Alexander Resurreccion','senior','b13',false),
('s124','Benoya, Christian John Dequito','junior','b14',false),
('s125','Cobar, Earl Joseph Ganon','trainee','b14',false),
('s126','Contiveros, Larc Larry Ybañez','junior','b14',false),
('s127','Almoite, Michael Blaser','senior','b15',false),
('s128','Coching, Kenn Vincent Mondragon','senior','b15',false),
('s129','Gomez, Michael John','senior','b15',false),
('s130','Rowy, Nikko Paolo Ello','senior','b15',false),
('s131','Ascueta, Leslie John Bolactia','senior','b16',false),
('s132','Carido, Jhon Paul Sajulga','trainee','b16',false),
('s133','Gonzales, Rommel Calulut','senior','b16',false),
('s134','Villena, Rodel De Vera','senior','b16',false),
('s135','Casingal, Teofilo III Licot','trainee','b16',false),
('s136','Aguirre, Mark Anthony Mordeno','trainee','b18',false),
('s137','Alburo, Mark Francis','junior','b18',false),
('s138','Catcharro, Richard Fiel','junior','b18',false),
('s139','Coliflores, Darel John Sulogaol','bsm','b18',false),
('s140','Panao Jr., Julito Palamos','junior','b18',false),
('s141','Urbano, Joven Epres','senior','b18',false),
('s142','Obnimaga, Mark Sialon','senior','b19',false),
('s143','Tandoc, Jesus Macias','junior','b19',false),
('s144','Justo, Raymond','junior','b19',false),
('s145','Alabi, Abdel Varr Esmali','junior','b20',false),
('s146','Esmael, Mujaheed Alabi','trainee','b20',false),
('s147','Mendez, Jestoni Polinar','junior','b20',false),
('s148','Mendez, Kevin Fernandez','senior','b20',false),
('s149','Roferos, Jaypee','senior','b20',false),
('s150','Shia, Nicholson Clifford Samson','senior','b20',false),
('s151','Taruc, Rodel Tizon','junior','b20',false)
on conflict (id) do nothing;
