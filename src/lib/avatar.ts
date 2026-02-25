import { supabase } from "@/integrations/supabase/client";

const AVATAR_BUCKET = "avatars";

export const uploadAvatarImage = async (userId: string, file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${userId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};
