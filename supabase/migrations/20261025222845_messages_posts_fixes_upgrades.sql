BEGIN;

-- Fix: previously open UPDATE policy let anyone edit any post, further without its corresponding frontend implementation
DROP POLICY IF EXISTS "posts_update_allowed_authenticated" ON public.posts;

-- Edit/delete own messages <- upgrade
CREATE POLICY "Senders can update own messages"
ON public.messages FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = sender_id)
WITH CHECK ((SELECT auth.uid()) = sender_id);

CREATE POLICY "Senders can delete own messages"
ON public.messages FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = sender_id);

-- Fix: leaving a group didn't revoke chat access (could still be seen if you clicked Back in the browser)
CREATE OR REPLACE FUNCTION public.remove_conversation_participant_on_group_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.conversation_participants cp
  USING public.groups g
  WHERE g.group_id = OLD.group_id
    AND cp.conversation_id = g.conversation_id
    AND cp.user_id = OLD.user_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER group_members_leave_removes_chat_access
AFTER DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.remove_conversation_participant_on_group_leave();

-- Fix: invite_user_to_group was Admin-only for every group; this upgrade now allows
-- Admin-only for PRIVATE groups, any member for PUBLIC groups.
CREATE OR REPLACE FUNCTION public.invite_user_to_group(p_group_id bigint, p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  is_private boolean;
  is_admin boolean;
  is_member boolean;
BEGIN
  SELECT (privacy = 'private') INTO is_private FROM public.groups WHERE group_id = p_group_id;
  SELECT EXISTS(SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'Admin') INTO is_admin;
  SELECT EXISTS(SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid()) INTO is_member;

  IF NOT is_member THEN
    RAISE EXCEPTION 'Not authorized to invite members to this group';
  END IF;

  IF is_private AND NOT is_admin THEN
    RAISE EXCEPTION 'Only group admins can invite to a private group';
  END IF;

  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = p_target_user_id) THEN
    RAISE EXCEPTION 'User is already a member of this group';
  END IF;

  INSERT INTO public.invites (group_id, user_id, status)
  VALUES (p_group_id, p_target_user_id, 'pending');
END;
$function$;

COMMIT;
