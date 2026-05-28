-- Script de configuration SQL pour Supabase (EventFlow)

-- 1. Table Profiles (Profils utilisateurs étendus)
DROP TABLE IF EXISTS public.profiles;
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  avatar_url text,
  role text CHECK (role IN ('dispatcher', 'technician', 'driver', 'manager')) DEFAULT 'technician',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les profils sont visibles par tous les utilisateurs connectés" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Les utilisateurs peuvent créer leur propre profil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Fonction et Trigger pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    COALESCE(new.raw_user_meta_data->>'role', 'technician')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Table des Missions
DROP TABLE IF EXISTS public.missions;
CREATE TABLE public.missions (
  id text PRIMARY KEY,
  title text NOT NULL,
  client text NOT NULL,
  location text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  status text NOT NULL,
  staff_ids text[] DEFAULT '{}'::text[],
  vehicle_id text,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Missions visibles pour tous" ON public.missions FOR SELECT USING (true);
CREATE POLICY "Missions modifiables" ON public.missions FOR ALL USING (true);

-- 4. Table des Équipements
DROP TABLE IF EXISTS public.equipment;
CREATE TABLE public.equipment (
  id text PRIMARY KEY,
  qr_code text NOT NULL,
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL,
  status text NOT NULL,
  current_mission_id text,
  weight_kg numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipements visibles pour tous" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "Equipements modifiables" ON public.equipment FOR ALL USING (true);

-- 5. Table MissionEquipment
DROP TABLE IF EXISTS public.mission_equipment;
CREATE TABLE public.mission_equipment (
  mission_id text REFERENCES public.missions(id) ON DELETE CASCADE,
  equipment_id text REFERENCES public.equipment(id) ON DELETE CASCADE,
  planned_quantity integer DEFAULT 1,
  loaded_quantity integer DEFAULT 0,
  returned_quantity integer DEFAULT 0,
  out_scan_time text,
  in_scan_time text,
  PRIMARY KEY (mission_id, equipment_id)
);
ALTER TABLE public.mission_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MissionEquipment visibles pour tous" ON public.mission_equipment FOR SELECT USING (true);
CREATE POLICY "MissionEquipment modifiables" ON public.mission_equipment FOR ALL USING (true);

-- 6. Table des Véhicules
DROP TABLE IF EXISTS public.vehicles;
CREATE TABLE public.vehicles (
  id text PRIMARY KEY,
  plate text NOT NULL,
  model text NOT NULL,
  capacity_volume numeric,
  capacity_weight numeric,
  status text NOT NULL
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Véhicules visibles pour tous" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Véhicules modifiables" ON public.vehicles FOR ALL USING (true);

-- 7. Table des Incidents
DROP TABLE IF EXISTS public.incidents;
CREATE TABLE public.incidents (
  id text PRIMARY KEY,
  mission_id text NOT NULL,
  equipment_id text,
  reported_by text NOT NULL,
  description text NOT NULL,
  status text NOT NULL,
  created_at text NOT NULL
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Incidents visibles pour tous" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Incidents modifiables" ON public.incidents FOR ALL USING (true);

-- Publications pour le temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE missions;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE mission_equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;

-- 8. Storage pour les Avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload their own avatar." ON storage.objects;
CREATE POLICY "Users can upload their own avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND name like auth.uid()::text || '%');
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar." ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND name like auth.uid()::text || '%');
DROP POLICY IF EXISTS "Users can delete their own avatar." ON storage.objects;
CREATE POLICY "Users can delete their own avatar." ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND name like auth.uid()::text || '%');

-- 9. Table des Clients (CRM)
DROP TABLE IF EXISTS public.clients CASCADE;
CREATE TABLE public.clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  country text,
  website text,
  industry text,
  status text NOT NULL DEFAULT 'prospect',
  pipeline_stage text NOT NULL DEFAULT 'lead',
  notes text,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients visibles pour tous" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Clients modifiables" ON public.clients FOR ALL USING (true);

-- 10. Table des Contacts (CRM)
DROP TABLE IF EXISTS public.contacts CASCADE;
CREATE TABLE public.contacts (
  id text PRIMARY KEY,
  client_id text REFERENCES public.clients(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  role text,
  is_primary boolean DEFAULT false,
  created_at text NOT NULL
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contacts visibles pour tous" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Contacts modifiables" ON public.contacts FOR ALL USING (true);

-- 11. Table des Notes Client (CRM)
DROP TABLE IF EXISTS public.client_notes CASCADE;
CREATE TABLE public.client_notes (
  id text PRIMARY KEY,
  client_id text REFERENCES public.clients(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id text,
  created_at text NOT NULL
);
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client Notes visibles pour tous" ON public.client_notes FOR SELECT USING (true);
CREATE POLICY "Client Notes modifiables" ON public.client_notes FOR ALL USING (true);

-- 12. Table des Rappels Client (CRM)
DROP TABLE IF EXISTS public.client_reminders CASCADE;
CREATE TABLE public.client_reminders (
  id text PRIMARY KEY,
  client_id text REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date text NOT NULL,
  done boolean DEFAULT false,
  created_at text NOT NULL
);
ALTER TABLE public.client_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client Reminders visibles pour tous" ON public.client_reminders FOR SELECT USING (true);
CREATE POLICY "Client Reminders modifiables" ON public.client_reminders FOR ALL USING (true);

-- 13. Table des Documents Client (CRM)
DROP TABLE IF EXISTS public.client_documents CASCADE;
CREATE TABLE public.client_documents (
  id text PRIMARY KEY,
  client_id text REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  status text NOT NULL,
  uploaded_at text NOT NULL
);
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client Documents visibles pour tous" ON public.client_documents FOR SELECT USING (true);
CREATE POLICY "Client Documents modifiables" ON public.client_documents FOR ALL USING (true);

-- 14. Table des Revenus Client (CRM)
DROP TABLE IF EXISTS public.client_revenue CASCADE;
CREATE TABLE public.client_revenue (
  id text PRIMARY KEY,
  client_id text REFERENCES public.clients(id) ON DELETE CASCADE,
  mission_id text,
  amount numeric NOT NULL,
  description text,
  date text NOT NULL
);
ALTER TABLE public.client_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client Revenue visibles pour tous" ON public.client_revenue FOR SELECT USING (true);
CREATE POLICY "Client Revenue modifiables" ON public.client_revenue FOR ALL USING (true);

-- Ajout des publications pour le temps réel CRM
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE client_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE client_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE client_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE client_revenue;
