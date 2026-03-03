-- Add user_id column to previews table
ALTER TABLE previews ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Create index for faster lookups by user
CREATE INDEX idx_previews_user_id ON previews(user_id);

-- Enable Row Level Security
ALTER TABLE previews ENABLE ROW LEVEL SECURITY;

-- Public: anyone can view previews (they are shareable via slug)
CREATE POLICY "Previews are publicly viewable"
  ON previews FOR SELECT
  USING (true);

-- Owner: authenticated users can insert their own previews
CREATE POLICY "Users can insert their own previews"
  ON previews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owner: authenticated users can update their own previews
CREATE POLICY "Users can update their own previews"
  ON previews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner: authenticated users can delete their own previews
CREATE POLICY "Users can delete their own previews"
  ON previews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
