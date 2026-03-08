
-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Host or guest can update room" ON public.game_rooms;

-- Create new UPDATE policy that also allows any authenticated user to claim a room with null guest_id
CREATE POLICY "Host or guest can update room" ON public.game_rooms
FOR UPDATE TO authenticated
USING (
  auth.uid() = host_id 
  OR auth.uid() = guest_id 
  OR guest_id IS NULL
);
