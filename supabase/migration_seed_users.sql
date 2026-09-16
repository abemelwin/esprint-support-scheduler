-- ============================================================
-- Migration: Seed Users and Access Roles
-- ES Print Support Scheduler
-- ============================================================

-- Note: The users have been provisioned in Supabase Auth and app_users.
-- Default temporary password set during initial provisioning: Esprint2026!

-- 1. Super Admins
-- arnold@esprintmedia.com (Arnold Rioja) -> Admin, Can Edit: true
-- dan@esprintmedia.com (Danilo Carangan) -> Admin, Can Edit: true
-- eileensokua@esprintmedia.com (Eileen So Kua) -> Admin, Can Edit: true

-- 2. Luzon Schedulers
-- esprint.rickyeina@gmail.com (Ricky Eina) -> Service Manager (Luzon branches), Can Edit: true
-- espmi.limwel@gmail.com (Limwel De Chavez) -> Service Manager (CAB, ISA, PANG), Can Edit: true

-- 3. Viewers only - All Branches (can_edit: false)
-- espmi.mavenus@gmail.com (Venus Liloan) -> Branch / All Branches, Can Edit: false
-- espmi.angelie@gmail.com (Angelie Tamondong) -> Branch / All Branches, Can Edit: false
-- espmi.ariane@gmail.com (Arianne Espinosa) -> Branch / All Branches, Can Edit: false
-- esprint.philipgarcia@gmail.com (June Philip Garcia) -> Branch / All Branches, Can Edit: false
-- esprint_johntrentsioco@yahoo.com (John Trent Sioco) -> Branch / All Branches, Can Edit: false
-- esprint.natan@gmail.com (Dennis Natan) -> Branch / All Branches, Can Edit: false
-- esprint_donalexander@yahoo.com (Don Alexander Yumang) -> Branch / All Branches, Can Edit: false

-- 4. Luzon Branch Users
-- escgi.michael@gmail.com (Michael Almoite) -> Branch (PAL), Can Edit: true

-- 5. Visayas Branch Users / Schedulers
-- esprint_principe@yahoo.com (Michael Principe) -> Service Manager (BAC, ILO), Can Edit: true
-- esprint.jessrielcalvo@gmail.com (Jessriel Calvo) -> Branch (CEB), Can Edit: true
-- esprint.darelcoliflores@gmail.com (John Darel Coliflores) -> Branch (TAC), Can Edit: true

-- 6. Mindanao North
-- espii.geralds@gmail.com (Gerald Sacuan) -> Service Manager (All North: BUK, BUT, CDO, PAG, ZAM), Can Edit: true
-- espii.kevinn@gmail.com (Kevin Mendez) -> Branch (PAG), Can Edit: true
-- esprint.nicholson@gmail.com (Nicholson Sia) -> Branch (ZAM), Can Edit: true
-- espii.michaelt@gmail.com (Michael Tagupa) -> Branch (BUT), Can Edit: true
-- espii.paul@gmail.com (Paul Anthony Dabatian) -> Branch (BUK), Can Edit: true

-- 7. Mindanao South
-- espii.junjun@gmail.com (Martin Genabe) -> Service Manager (All South: DAV, GENSAN, TAG), Can Edit: true
-- espii.haber@gmail.com (Habel Basal) -> Branch (GENSAN), Can Edit: true
