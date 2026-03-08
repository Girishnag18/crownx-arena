CREATE POLICY "Users can delete own notifications"
ON public.player_notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);