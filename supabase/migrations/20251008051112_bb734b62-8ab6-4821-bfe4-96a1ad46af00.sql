-- Create enum types for incident status and priority
CREATE TYPE incident_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE incident_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'security_officer',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status incident_status NOT NULL DEFAULT 'open',
  priority incident_priority NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  evidence_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create incident updates table for timeline/comments
CREATE TABLE public.incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  update_type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Incidents policies
CREATE POLICY "Authenticated users can view all incidents"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create incidents"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Authenticated users can update incidents"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (true);

-- Incident updates policies
CREATE POLICY "Authenticated users can view incident updates"
  ON public.incident_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create incident updates"
  ON public.incident_updates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for incident evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-evidence', 'incident-evidence', false);

-- Storage policies for incident evidence
CREATE POLICY "Authenticated users can view incident evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'incident-evidence');

CREATE POLICY "Authenticated users can upload incident evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'incident-evidence');

-- Create indexes for better performance
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_priority ON public.incidents(priority);
CREATE INDEX idx_incidents_reporter ON public.incidents(reporter_id);
CREATE INDEX idx_incidents_assigned ON public.incidents(assigned_to);
CREATE INDEX idx_incidents_created_at ON public.incidents(created_at DESC);
CREATE INDEX idx_incident_updates_incident ON public.incident_updates(incident_id);